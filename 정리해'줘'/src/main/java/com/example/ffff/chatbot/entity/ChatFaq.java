package com.example.ffff.chatbot.entity;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "CHAT_FAQ")
@Getter
@Setter
public class ChatFaq {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "chat_faq_seq_gen")
    @SequenceGenerator(
            name = "chat_faq_seq_gen",
            sequenceName = "CHAT_FAQ_SEQ",
            allocationSize = 1
    )
    @Column(name = "FAQ_ID")
    private Long faqId;

    @Column(name = "QUESTION_PATTERN", length = 200)
    private String questionPattern;

    @Column(name = "ANSWER_TEXT", columnDefinition = "TEXT")
    private String answerText;
}
