import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageCircle,
  Send,
  Plus,
  ArrowLeft,
  Edit,
  Trash2,
  Hash,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TeamChat() {
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  const [newRoom, setNewRoom] = useState({
    room_name: "",
    room_type: "department",
    department: "",
    description: "",
    is_public: true,
    icon: "💬",
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: chatRooms = [] } = useQuery({
    queryKey: ["chatRooms"],
    queryFn: () => base44.entities.ChatRoom.list("-last_message_at"),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["chatMessages", selectedRoom?.id],
    queryFn: () =>
      selectedRoom
        ? base44.entities.ChatMessage.filter({ room_id: selectedRoom.id }, "-created_date")
        : Promise.resolve([]),
    enabled: !!selectedRoom,
  });

  const createRoomMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatRoom.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatRooms"] });
      setShowCreateRoom(false);
      setEditingRoom(null);
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
      queryClient.invalidateQueries({ queryKey: ["chatRooms"] });
      setShowCreateRoom(false);
      setEditingRoom(null);
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
      queryClient.invalidateQueries({ queryKey: ["chatRooms"] });
      if (selectedRoom) {
        setSelectedRoom(null);
      }
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatMessages", selectedRoom?.id] });
      setMessageText("");
    },
  });

  useEffect(() => {
    if (chatRooms.length === 0 && user?.email) {
      const defaultRooms = [
        {
          room_name: "General",
          room_type: "broadcast",
          icon: "💬",
          department: "all",
          description: "General announcements and team updates",
        },
        {
          room_name: "Kitchen Team",
          room_type: "department",
          icon: "👨‍🍳",
          department: "kitchen",
          description: "Kitchen team communication",
        },
        {
          room_name: "Front of House",
          room_type: "department",
          icon: "🍽️",
          department: "front_of_house",
          description: "FOH team communication",
        },
      ];

      defaultRooms.forEach((room) => {
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
    if (chatRooms.length > 0 && !selectedRoom) {
      setSelectedRoom(chatRooms[0]);
    }
  }, [chatRooms]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedRoom || !user) return;

    await sendMessageMutation.mutateAsync({
      room_id: selectedRoom.id,
      room_name: selectedRoom.room_name,
      sender_email: user.email,
      sender_name: user.full_name,
      message_content: messageText,
      message_type: "text",
      read_by: [user.email],
    });
  };

  const handleCreateOrUpdateRoom = async (e) => {
    e.preventDefault();

    const roomData = {
      ...newRoom,
      created_by_email: user.email,
      created_by_name: user.full_name,
      last_message_at: new Date().toISOString(),
    };

    if (editingRoom) {
      await updateRoomMutation.mutateAsync({
        id: editingRoom.id,
        data: roomData,
      });
    } else {
      await createRoomMutation.mutateAsync(roomData);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (confirm("Are you sure you want to delete this channel?")) {
      await deleteRoomMutation.mutateAsync(roomId);
    }
  };

  const handleEditRoom = (room) => {
    setEditingRoom(room);
    setNewRoom({
      room_name: room.room_name,
      room_type: room.room_type,
      department: room.department || "",
      description: room.description || "",
      is_public: room.is_public,
      icon: room.icon || "💬",
    });
    setShowCreateRoom(true);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
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
        {(user?.role === "admin" || user?.position === "manager" || user?.position === "owner") && (
          <Button
            onClick={() => {
              setEditingRoom(null);
              setNewRoom({
                room_name: "",
                room_type: "department",
                department: "",
                description: "",
                is_public: true,
                icon: "💬",
              });
              setShowCreateRoom(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Channel
          </Button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 mb-2">Channels</h2>
            <p className="text-xs text-gray-500">{chatRooms.length} active channels</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chatRooms.map((room) => (
              <div
                key={room.id}
                className={`relative group ${
                  selectedRoom?.id === room.id
                    ? "bg-blue-50 border-l-4 border-blue-600"
                    : "hover:bg-gray-50"
                }`}
              >
                <button
                  onClick={() => setSelectedRoom(room)}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                >
                  <span className="text-2xl">{room.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {room.room_name}
                    </p>
                    {room.description && (
                      <p className="text-xs text-gray-500 truncate">{room.description}</p>
                    )}
                  </div>
                  {room.room_type === "broadcast" && (
                    <Badge variant="outline" className="text-xs">
                      📢
                    </Badge>
                  )}
                </button>

                {(user?.role === "admin" || user?.position === "manager" || user?.position === "owner") && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditRoom(room);
                      }}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRoom(room.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-gray-50">
          {selectedRoom ? (
            <>
              <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selectedRoom.icon}</span>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {selectedRoom.room_name}
                    </h2>
                    {selectedRoom.description && (
                      <p className="text-sm text-gray-600">{selectedRoom.description}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <Card
                      key={msg.id}
                      className={`max-w-2xl ${
                        msg.sender_email === user?.email ? "ml-auto bg-blue-50" : "bg-white"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {msg.sender_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-sm text-gray-900">
                                {msg.sender_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {format(new Date(msg.created_date), "HH:mm")}
                              </p>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">
                              {msg.message_content}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              <div className="bg-white border-t border-gray-200 p-4">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={`Message ${selectedRoom.room_name}...`}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Select a channel to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showCreateRoom} onOpenChange={setShowCreateRoom}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? "Edit Channel" : "Create New Channel"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOrUpdateRoom} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Channel Icon</Label>
              <Input
                value={newRoom.icon}
                onChange={(e) => setNewRoom({ ...newRoom, icon: e.target.value })}
                placeholder="💬"
                maxLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Channel Name</Label>
              <Input
                value={newRoom.room_name}
                onChange={(e) => setNewRoom({ ...newRoom, room_name: e.target.value })}
                placeholder="e.g., Kitchen Team"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newRoom.description}
                onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                placeholder="What's this channel for?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Channel Type</Label>
              <Select
                value={newRoom.room_type}
                onValueChange={(value) => setNewRoom({ ...newRoom, room_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="broadcast">Broadcast (Announcements)</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="group">Group Chat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newRoom.room_type === "department" && (
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={newRoom.department}
                  onValueChange={(value) => setNewRoom({ ...newRoom, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="front_of_house">Front of House</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="management">Management</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateRoom(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={createRoomMutation.isPending || updateRoomMutation.isPending}
              >
                {editingRoom ? "Update Channel" : "Create Channel"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}