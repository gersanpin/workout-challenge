import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, EmptyState, Muted, Screen, Title } from '../components/ui';
import { colors, radii, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { extractYoutubeUrl, searchGifs, type GifResult } from '../lib/giphy';
import { supabase } from '../lib/supabase';
import type { ChatMessage } from '../types';

export function ChatScreen() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [gifQuery, setGifQuery] = useState('workout');
  const [gifs, setGifs] = useState<GifResult[]>([]);

  const load = useCallback(async () => {
    if (!profile?.group_id) {
      setMessages([]);
      return;
    }
    const { data } = await supabase
      .from('chat_messages')
      .select('*, profiles(display_name, avatar_url)')
      .eq('group_id', profile.group_id)
      .order('created_at', { ascending: false })
      .limit(100);
    setMessages((data as ChatMessage[]) ?? []);
  }, [profile?.group_id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!showGifs) return;
    void searchGifs(gifQuery).then(setGifs).catch(() => setGifs([]));
  }, [showGifs, gifQuery]);

  const send = async (payload: {
    body?: string | null;
    media_url?: string | null;
    media_type?: ChatMessage['media_type'];
    link_url?: string | null;
  }) => {
    if (!user || !profile?.group_id) return;
    setSending(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        group_id: profile.group_id,
        user_id: user.id,
        body: payload.body ?? null,
        media_url: payload.media_url ?? null,
        media_type: payload.media_type ?? 'text',
        link_url: payload.link_url ?? null,
      });
      if (error) throw new Error(error.message);
      setText('');
      setShowGifs(false);
      await load();
    } catch (e) {
      console.warn(e);
    } finally {
      setSending(false);
    }
  };

  const onSendText = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const yt = extractYoutubeUrl(trimmed);
    if (yt) {
      await send({
        body: trimmed,
        media_type: 'link',
        link_url: yt,
      });
      return;
    }
    await send({ body: trimmed, media_type: 'text' });
  };

  if (!profile?.group_id) {
    return (
      <Screen>
        <Title>Chat</Title>
        <EmptyState
          title="Join a group first"
          body="Create or join a Fortachones group from Home to unlock chat."
        />
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={styles.header}>
        <Title>Group chat</Title>
        <Muted>Text, GIFs, photos vibes, YouTube links open natively.</Muted>
      </View>

      <FlatList
        inverted
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const mine = item.user_id === user?.id;
          return (
            <View
              style={[
                styles.bubble,
                mine ? styles.bubbleMe : styles.bubbleThem,
              ]}
            >
              {!mine ? (
                <Text style={styles.author}>
                  {item.profiles?.display_name ?? 'Friend'}
                </Text>
              ) : null}
              {item.media_type === 'gif' && item.media_url ? (
                <Image source={{ uri: item.media_url }} style={styles.gif} />
              ) : null}
              {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
              {item.link_url ? (
                <Pressable
                  onPress={() => void Linking.openURL(item.link_url!)}
                >
                  <Text style={styles.link}>{item.link_url}</Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ padding: spacing.md }}>
            <EmptyState
              title="Say hi"
              body="Share a GIF, a YouTube class, or roast someone’s form."
            />
          </View>
        }
      />

      {showGifs ? (
        <View style={styles.gifPanel}>
          <TextInput
            style={styles.gifSearch}
            placeholder="Search GIFs"
            placeholderTextColor={colors.textDim}
            value={gifQuery}
            onChangeText={setGifQuery}
          />
          <FlatList
            horizontal
            data={gifs}
            keyExtractor={(g) => g.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  void send({
                    media_url: item.url,
                    media_type: 'gif',
                    body: item.title,
                  })
                }
              >
                <Image source={{ uri: item.preview }} style={styles.gifThumb} />
              </Pressable>
            )}
          />
        </View>
      ) : null}

      <View style={styles.composer}>
        <Pressable onPress={() => setShowGifs((s) => !s)} style={styles.gifBtn}>
          <Text style={styles.gifBtnText}>GIF</Text>
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder="Message…"
          placeholderTextColor={colors.textDim}
          value={text}
          onChangeText={setText}
          multiline
        />
        <Button label="Send" onPress={() => void onSendText()} loading={sending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    gap: 4,
    marginBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: colors.chatBubbleMe,
  },
  bubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: colors.chatBubbleThem,
  },
  author: { fontWeight: '700', color: colors.navy, fontSize: 12 },
  body: { color: colors.text, lineHeight: 20 },
  link: { color: colors.accent, fontWeight: '700', textDecorationLine: 'underline' },
  gif: { width: 180, height: 140, borderRadius: radii.sm },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  gifBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
  },
  gifBtnText: { color: colors.accentDark, fontWeight: '800' },
  gifPanel: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.bg,
    maxHeight: 160,
  },
  gifSearch: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    backgroundColor: colors.bgElevated,
  },
  gifThumb: {
    width: 96,
    height: 96,
    borderRadius: radii.sm,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
  },
});
