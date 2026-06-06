"use client";

import { useCallback, useEffect, useState } from "react";
import { type UIMessage } from "ai";

import { ChatArea } from "@/components/chat-area";
import { Sidebar } from "@/components/sidebar";

import {
  clearAllConversations,
  loadConversations,
  loadPreferences,
  saveConversation,
  savePreferences,
  type StoredConversation,
  type UserPreferences,
} from "@/lib/storage";

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [activeId, setActiveId] = useState(() => newId());
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | undefined>(undefined);
  const [preferences, setPreferences] = useState<UserPreferences>({
    recentOccasions: [],
    recentRecipients: [],
    recentProductTypes: [],
  });

  useEffect(() => {
    setConversations(loadConversations());
    setPreferences(loadPreferences());
  }, []);

  const handleSave = useCallback(
    (messages: UIMessage[], title: string) => {
      const conv: StoredConversation = {
        id: activeId,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages,
      };
      saveConversation(conv);
      setConversations(loadConversations());
    },
    [activeId],
  );

  const handlePreferencesUpdate = useCallback((updated: UserPreferences) => {
    setPreferences(updated);
    savePreferences(updated);
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveId(newId());
    setInitialMessages(undefined);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    const conv = loadConversations().find((c) => c.id === id);
    if (!conv) return;
    setInitialMessages(conv.messages);
    setActiveId(id);
  }, []);

  const handleClearAll = useCallback(() => {
    clearAllConversations();
    setConversations([]);
    setActiveId(newId());
    setInitialMessages(undefined);
  }, []);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        onNewChat={handleNewChat}
        onSelect={handleSelectConversation}
        onClearAll={handleClearAll}
      />
      <ChatArea
        key={activeId}
        conversationId={activeId}
        initialMessages={initialMessages}
        preferences={preferences}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onSave={handleSave}
        onPreferencesUpdate={handlePreferencesUpdate}
      />
    </div>
  );
}
