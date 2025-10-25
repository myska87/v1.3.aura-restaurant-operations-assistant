
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Plus,
  Hash,
  Users,
  Pin,
  Paperclip,
  Smile,
  ArrowLeft,
  Home,
  MessageCircle,
  Edit,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";

const REACTIONS = ["👍", "❤️", "🔥", "😄", "🎉"];

export default function TeamChat() {
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);

  const [newRoom, setNewRoom] = useState({
    room_name: "",
    room_type: "department",
    department: "",
    description: "",
    is_public: true,
    icon: "💬",
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: chatRooms = [] } = useQuery({
    queryKey: ['chatRooms'],
    queryFn: () => base44.entities.ChatRoom.list('-last_message_at'),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', selectedRoom?.id],
    queryFn: () => base44.entities.ChatMessage.filter({ room_id: selectedRoom?.id }, '-created_date'),
    enabled: !!selectedRoom?.id,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  const { data: reactions = [] } = useQuery({
    queryKey: ['chatReactions', selectedRoom?.id],
    queryFn: () => base44.entities.ChatReaction.list(),
    enabled: !!selectedRoom?.id,
  });

  const createRoomMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatRoom.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      setShowCreateRoom(false);
      setNewRoom({
        room_name: "",
        room_type: "department",
        department: "",
        description: "",
        is_public: true,
        icon: "💬",
      });
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChatRoom.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      setShowCreateRoom(false);
      setSelectedRoom(null); // Clear selected room after update
      setNewRoom({
        room_name: "",
        room_type: "department",
        department: "",
        description: "",
        is_public: true,
        icon: "💬",
      });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (id) => base44.entities.ChatRoom.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      setSelectedRoom(null); // Clear selected room if deleted
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      // Update room's last_message_at
      if (selectedRoom) {
        await base44.entities.ChatRoom.update(selectedRoom.id, {
          last_message_at: new Date().toISOString()
        });
        queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      }
    },
  });

  const addReactionMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatReaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatReactions'] });
    },
  });

  useEffect(() => {
    // Initialize default rooms if none exist
    if (chatRooms.length === 0 && user?.email) {
      const defaultRooms = [
        {
          room_name: "General",
          room_type: "broadcast",
          icon: "💬",
          department: "all",
          description: "General announcements and team updates"
        },
        {
          room_name: "Kitchen Team",
          room_type: "department",
          icon: "👨‍🍳",
          department: "kitchen",
          description: "Kitchen team communication"
        },
        {
          room_name: "Front of House",
          room_type: "department",
          icon: "🍽️",
          department: "front_of_house",
          description: "FOH team communication"
        },
      ];

      defaultRooms.forEach(room => {
        createRoomMutation.mutate({
          ...room,
          created_by_email: user.email,
          created_by_name: user.full_name,
          is_public: true,
          last_message_at: new Date().toISOString(),
        });
      });
    }
  }, [chatRooms.length, user?.email]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedRoom) return;

    await sendMessageMutation.mutateAsync({
      room_id: selectedRoom.id,
      room_name: selectedRoom.room_name,
      sender_email: user?.email,
      sender_name: user?.full_name,
      message_content: messageInput,
      message_type: "text",
      read_by: [user?.email],
    });

    setMessageInput("");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoom) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await sendMessageMutation.mutateAsync({
        room_id: selectedRoom.id,
        room_name: selectedRoom.room_name,
        sender_email: user?.email,
        sender_name: user?.full_name,
        message_content: `Shared a file: ${file.name}`,
        message_type: file.type.startsWith('image/') ? 'image' : 'file',
        attachments: [file_url],
        read_by: [user?.email],
      });
    } catch (error) {
      console.error("Error uploading file:", error);
    }
    setUploading(false);
  };

  const handleReaction = async (messageId, reactionType) => {
    // Check if user already reacted with this type
    const existingReaction = reactions.find(
      r => r.message_id === messageId &&
      r.staff_email === user?.email &&
      r.reaction_type === reactionType
    );

    if (existingReaction) {
      // Remove reaction
      await base44.entities.ChatReaction.delete(existingReaction.id);
    } else {
      // Add reaction
      await addReactionMutation.mutateAsync({
        message_id: messageId,
        staff_email: user?.email,
        staff_name: user?.full_name,
        reaction_type: reactionType,
      });
    }
  };

  const getMessageReactions = (messageId) => {
    const messageReactions = reactions.filter(r => r.message_id === messageId);
    const grouped = {};
    messageReactions.forEach(r => {
      if (!grouped[r.reaction_type]) {
        grouped[r.reaction_type] = [];
      }
      grouped[r.reaction_type].push(r.staff_name);
    });
    return grouped;
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl("CommunicationFeedback")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Team Chat</h1>
          </div>
        </div>
        {(user?.role === 'admin' || user?.position === 'manager') && (
          <Button onClick={() => setShowCreateRoom(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Channel
          </Button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Rooms List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 mb-2">Channels</h2>
            <p className="text-xs text-gray-500">{chatRooms.length} active channels</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chatRooms.map(room => (
              <div
                key={room.id}
                className={`relative group ${
                  selectedRoom?.id === room.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'
                }`}
              >
                <button
                  onClick={() => setSelectedRoom(room)}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                >
                  <span className="text-2xl">{room.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{room.room_name}</p>
                    {room.description && (
                      <p className="text-xs text-gray-500 truncate">{room.description}</p>
                    )}
                  </div>
                  {room.room_type === 'broadcast' && (
                    <Badge variant="outline" className="text-xs">📢</Badge>
                  )}
                </button>

                {/* Edit/Delete Buttons for Admins */}
                {(user?.role === 'admin' || user?.position === 'manager') && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRoom(room);
                        setNewRoom({
                          room_name: room.room_name,
                          room_type: room.room_type,
                          department: room.department || "",
                          description: room.description || "",
                          is_public: room.is_public,
                          icon: room.icon || "💬",
                        });
                        setShowCreateRoom(true);
                      }}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    {room.room_type !== 'broadcast' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete channel "${room.room_name}"?`)) {
                            deleteRoomMutation.mutate(room.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Channel Management Footer */}
          {(user?.role === 'admin' || user?.position === 'manager') && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-600 mb-2">💡 Tip: Hover over channels to edit or delete</p>
            </div>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedRoom ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selectedRoom.icon}</span>
                    <div>
                      <h2 className="font-bold text-gray-900">{selectedRoom.room_name}</h2>
                      {selectedRoom.description && (
                        <p className="text-sm text-gray-500">{selectedRoom.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {selectedRoom.room_type.replace('_', ' ')}
                    </Badge>
                    {selectedRoom.department && selectedRoom.department !== 'all' && (
                      <Badge variant="outline" className="capitalize">
                        {selectedRoom.department.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                <AnimatePresence>
                  {messages.map((message) => {
                    const isOwnMessage = message.sender_email === user?.email;
                    const isSystemMessage = message.sender_email === "system";
                    const messageReactions = getMessageReactions(message.id);

                    // Special styling for system announcements
                    if (isSystemMessage && message.message_type === "announcement") {
                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex justify-center"
                        >
                          <div className="max-w-[80%] bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-2xl px-6 py-4 shadow-lg">
                            <p className="text-center font-semibold">{message.message_content}</p>
                            <p className="text-xs text-center text-blue-100 mt-2">
                              {format(new Date(message.created_date), 'p')}
                            </p>
                          </div>
                        </motion.div>
                      );
                    }

                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          {!isOwnMessage && (
                            <p className="text-xs text-gray-500 mb-1 px-2">{message.sender_name}</p>
                          )}
                          <div className={`rounded-2xl px-4 py-3 ${
                            isOwnMessage
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-900 border border-gray-200'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{message.message_content}</p>
                            {message.attachments?.map((url, idx) => (
                              <div key={idx} className="mt-2">
                                {message.message_type === 'image' ? (
                                  <img src={url} alt="attachment" className="rounded-lg max-w-xs" />
                                ) : (
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline text-xs">
                                    View attachment
                                  </a>
                                )}
                              </div>
                            ))}
                            <p className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-200' : 'text-gray-400'}`}>
                              {format(new Date(message.created_date), 'p')}
                            </p>
                          </div>

                          {/* Reactions */}
                          <div className="flex items-center gap-2 mt-2 px-2">
                            {Object.entries(messageReactions).map(([emoji, names]) => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(message.id, emoji)}
                                className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 transition-all ${
                                  names.includes(user?.full_name)
                                    ? 'bg-blue-100 border-2 border-blue-600'
                                    : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                                title={names.join(', ')}
                              >
                                <span>{emoji}</span>
                                <span className="font-medium">{names.length}</span>
                              </button>
                            ))}
                            <div className="flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                              {REACTIONS.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(message.id, emoji)}
                                  className="w-6 h-6 rounded hover:bg-gray-200 flex items-center justify-center text-sm"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => document.getElementById('file-upload').click()}
                    disabled={uploading}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>

                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1"
                  />

                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a channel</h3>
                <p className="text-gray-500">Choose a channel from the sidebar to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Room Dialog */}
      <Dialog open={showCreateRoom} onOpenChange={(open) => {
        setShowCreateRoom(open);
        if (!open) {
          setSelectedRoom(null); // Clear selected room for editing when dialog closes
          setNewRoom({ // Reset newRoom state
            room_name: "",
            room_type: "department",
            department: "",
            description: "",
            is_public: true,
            icon: "💬",
          });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedRoom && selectedRoom.id ? 'Edit Channel' : 'Create New Channel'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Channel Name *</label>
              <Input
                value={newRoom.room_name}
                onChange={(e) => setNewRoom({ ...newRoom, room_name: e.target.value })}
                placeholder="e.g., Weekend Shift Team"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Channel Type *</label>
              <Select
                value={newRoom.room_type}
                onValueChange={(value) => setNewRoom({ ...newRoom, room_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="group">Group Chat</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                  {(user?.role === 'admin' || user?.position === 'owner') && (
                    <SelectItem value="broadcast">Broadcast (Announcements)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {newRoom.room_type === 'department' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Department</label>
                <Select
                  value={newRoom.department}
                  onValueChange={(value) => setNewRoom({ ...newRoom, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="front_of_house">Front of House</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="management">Management</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Channel Icon</label>
              <div className="grid grid-cols-8 gap-2">
                {['💬', '📢', '👨‍🍳', '🍽️', '🍹', '🧹', '🔧', '📋', '🎯', '💡', '🎉', '⚡', '🔥', '✨', '📱', '🏆'].map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewRoom({ ...newRoom, icon: emoji })}
                    className={`text-2xl p-2 rounded hover:bg-gray-100 ${
                      newRoom.icon === emoji ? 'bg-blue-100 ring-2 ring-blue-600' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={newRoom.description}
                onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                placeholder="What is this channel for?"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_public"
                checked={newRoom.is_public}
                onChange={(e) => setNewRoom({ ...newRoom, is_public: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="is_public" className="text-sm">
                Public channel (visible to everyone)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateRoom(false);
                  setSelectedRoom(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedRoom && selectedRoom.id) {
                    // Update existing room
                    updateRoomMutation.mutate({
                      id: selectedRoom.id,
                      data: newRoom
                    });
                  } else {
                    // Create new room
                    createRoomMutation.mutate({
                      ...newRoom,
                      created_by_email: user?.email,
                      created_by_name: user?.full_name,
                      last_message_at: new Date().toISOString(),
                    });
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!newRoom.room_name}
              >
                {selectedRoom && selectedRoom.id ? 'Update Channel' : 'Create Channel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
