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
        { room_name: "All Staff", room_type: "broadcast", icon: "📢", department: "all" },
        { room_name: "Front of House", room_type: "department", icon: "🍽️", department: "front_of_house" },
        { room_name: "Kitchen Team", room_type: "department", icon: "👨‍🍳", department: "kitchen" },
        { room_name: "Management", room_type: "department", icon: "👔", department: "management" },
      ];

      defaultRooms.forEach(room => {
        createRoomMutation.mutate({
          ...room,
          created_by_email: user.email,
          created_by_name: user.full_name,
          is_public: true,
          description: `${room.room_name} communication channel`,
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
        <Button onClick={() => setShowCreateRoom(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Room
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Rooms List */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 mb-2">Channels</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chatRooms.map(room => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                  selectedRoom?.id === room.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                }`}
              >
                <span className="text-2xl">{room.icon}</span>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900 text-sm">{room.room_name}</p>
                  {room.room_type === 'department' && (
                    <p className="text-xs text-gray-500">{room.department}</p>
                  )}
                </div>
                {room.room_type === 'broadcast' && (
                  <Badge variant="outline" className="text-xs">Broadcast</Badge>
                )}
              </button>
            ))}
          </div>
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
                  <Badge variant="outline">
                    <Users className="w-3 h-3 mr-1" />
                    {selectedRoom.members?.length || 'All Staff'}
                  </Badge>
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

      {/* Create Room Dialog */}
      <Dialog open={showCreateRoom} onOpenChange={setShowCreateRoom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Chat Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Room Name</label>
              <Input
                value={newRoom.room_name}
                onChange={(e) => setNewRoom({ ...newRoom, room_name: e.target.value })}
                placeholder="e.g., Weekend Shift Team"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Room Icon</label>
              <Input
                value={newRoom.icon}
                onChange={(e) => setNewRoom({ ...newRoom, icon: e.target.value })}
                placeholder="💬"
                maxLength={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={newRoom.description}
                onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                placeholder="What is this room for?"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateRoom(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createRoomMutation.mutate({
                  ...newRoom,
                  created_by_email: user?.email,
                  created_by_name: user?.full_name,
                  last_message_at: new Date().toISOString(),
                })}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Room
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}