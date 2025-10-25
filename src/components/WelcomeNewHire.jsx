import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function WelcomeNewHire() {
  const queryClient = useQueryClient();
  const [hasWelcomed, setHasWelcomed] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: onboardingProgress = [] } = useQuery({
    queryKey: ['onboardingProgress', user?.email],
    queryFn: () => base44.entities.OnboardingProgress.filter({ staff_email: user?.email }),
    enabled: !!user?.email,
  });

  const createChatMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
  });

  useEffect(() => {
    const welcomeNewHire = async () => {
      if (!user || hasWelcomed || user.role === 'admin') return;
      
      // Check if user just registered (no onboarding progress yet)
      if (onboardingProgress.length === 0) {
        try {
          // Find "All Staff" chat room
          const chatRooms = await base44.entities.ChatRoom.list();
          const allStaffRoom = chatRooms.find(room => room.room_name === "All Staff");
          
          if (allStaffRoom) {
            await createChatMessageMutation.mutateAsync({
              room_id: allStaffRoom.id,
              room_name: allStaffRoom.room_name,
              sender_email: "system",
              sender_name: "AURA System",
              message_content: `🎉 Welcome to the team, ${user.full_name}! We're excited to have you join Chai Patta. Your onboarding journey begins now!`,
              message_type: "announcement",
              attachments: [],
              read_by: [],
            });
            
            setHasWelcomed(true);
          }
        } catch (error) {
          console.error("Error posting welcome message:", error);
        }
      }
    };

    welcomeNewHire();
  }, [user, onboardingProgress, hasWelcomed]);

  return null;
}