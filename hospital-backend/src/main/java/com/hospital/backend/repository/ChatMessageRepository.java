package com.hospital.backend.repository;

import com.hospital.backend.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    /**
     * Récupère tous les messages échangés entre deux utilisateurs,
     * triés du plus ancien au plus récent.
     */
    @Query("SELECT m FROM ChatMessage m WHERE " +
            "(m.sender.id = :user1Id AND m.receiver.id = :user2Id) OR " +
            "(m.sender.id = :user2Id AND m.receiver.id = :user1Id) " +
            "ORDER BY m.createdAt ASC")
    List<ChatMessage> findConversationBetween(@Param("user1Id") Long user1Id, @Param("user2Id") Long user2Id);
}