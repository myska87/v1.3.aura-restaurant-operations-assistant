import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";

export default function WelcomeNewHire() {
  const { data: allStaff = [] } = useQuery({
    queryKey: ['allStaff'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const { data: chatRooms = [] } = useQuery({
    queryKey: ['chatRooms'],
    queryFn: () => base44.entities.ChatRoom.list(),
  });

  const createChatMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
  });

  useEffect(() => {
    const checkForNewHires = async () => {
      if (allStaff.length === 0 || chatRooms.length === 0) return;

      // Find All Staff room
      const allStaffRoom = chatRooms.find(room => room.room_name === "All Staff");
      if (!allStaffRoom) return;

      // Check for staff members created in the last 5 minutes
      const recentStaff = allStaff.filter(staff => {
        const createdDate = new Date(staff.created_date);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return createdDate > fiveMinutesAgo;
      });

      // Get existing welcome messages to avoid duplicates
      const messages = await base44.entities.ChatMessage.filter({ 
        room_id: allStaffRoom.id 
      });

      for (const staff of recentStaff) {
        // Check if we already sent a welcome message
        const alreadyWelcomed = messages.some(
          msg => msg.message_content.includes(staff.full_name) && 
          msg.message_content.includes("Welcome to the team")
        );

        if (!alreadyWelcomed) {
          await createChatMessageMutation.mutateAsync({
            room_id: allStaffRoom.id,
            room_name: allStaffRoom.room_name,
            sender_email: "system",
            sender_name: "AURA System",
            message_content: `🎉 Everyone, please welcome ${staff.full_name} to the team! 👋\n\n${staff.full_name} just joined as ${staff.position?.replace(/_/g, ' ')}. Let's make them feel at home! 🌟`,
            message_type: "announcement",
            attachments: [],
            read_by: [],
          });
        }
      }
    };

    checkForNewHires();
  }, [allStaff.length, chatRooms.length]);

  return null; // This is a background component, no UI
}