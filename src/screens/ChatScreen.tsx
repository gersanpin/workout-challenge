import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import {
  Brand,
  Button,
  Card,
  EmptyState,
  Field,
  Muted,
  Screen,
  Title,
} from '../components/ui';
import { APP_NAME } from '../constants/challenge';
import { borderWidth, colors, spacing, typography } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useChallengeData } from '../hooks/useChallengeData';
import { extractYoutubeUrl, searchGifs, type GifResult } from '../lib/giphy';
import {
  addGhostMember,
  createGroup,
  inviteLink,
  joinGroupWithCode,
  removeMember,
  startGroupChallenge,
} from '../lib/groupApi';
import { supabase } from '../lib/supabase';
import { deleteWorkout } from '../lib/workoutsApi';
import type { ChatMessage } from '../types';

export function ChatScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { group, leaderboard, refresh: refreshChallenge } = useChallengeData();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [gifQuery, setGifQuery] = useState('entrenamiento');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [showGroup, setShowGroup] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [ghostName, setGhostName] = useState('');
  const [busy, setBusy] = useState(false);

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
      .limit(120);
    setMessages((data as ChatMessage[]) ?? []);
  }, [profile?.group_id]);

  useFocusEffect(
    useCallback(() => {
      void load();
      void refreshChallenge();
    }, [load, refreshChallenge]),
  );

  useEffect(() => {
    if (!showGifs) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      void searchGifs(gifQuery)
        .then((rows) => {
          if (!cancelled) setGifs(rows);
        })
        .catch(() => {
          if (!cancelled) setGifs([]);
        });
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
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
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const onSendText = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const yt = extractYoutubeUrl(trimmed);
    if (yt) {
      await send({ body: trimmed, media_type: 'link', link_url: yt });
      return;
    }
    await send({ body: trimmed, media_type: 'text' });
  };

  const onDeleteWorkoutPost = (item: ChatMessage) => {
    if (!user || !item.workout_id || item.user_id !== user.id) return;
    Alert.alert(
      '¿Quitar este entrenamiento?',
      'Se elimina el registro y este mensaje del chat. El progreso semanal se recalcula.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteWorkout(item.workout_id!, user.id);
                await load();
                await refreshChallenge();
              } catch (e) {
                Alert.alert('Error', (e as Error).message);
              }
            })();
          },
        },
      ],
    );
  };

  const onCreateGroup = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await createGroup(user.id, APP_NAME);
      await refreshProfile();
      await refreshChallenge();
      Alert.alert('Grupo creado', 'Comparte el código de invitación.');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await joinGroupWithCode(user.id, inviteCode);
      await refreshProfile();
      await refreshChallenge();
      setInviteCode('');
    } catch (e) {
      Alert.alert('No se pudo unir', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!profile?.group_id) {
    return (
      <Screen>
        <Brand>{APP_NAME}</Brand>
        <Title>CHAT</Title>
        <Card style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Muted>
            Crea o únete a un grupo para el feed/chat unificado (registros + mensajes).
          </Muted>
          <Button
            label="Crear grupo (admin)"
            onPress={() => void onCreateGroup()}
            loading={busy}
          />
          <Field
            label="Código de invitación"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
            placeholder="ABCD1234"
          />
          <Button
            label="Unirme con código"
            variant="secondary"
            onPress={() => void onJoin()}
            loading={busy}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Brand>{APP_NAME}</Brand>
          <Title>CHAT</Title>
        </View>
        <Pressable style={styles.groupBtn} onPress={() => setShowGroup(true)}>
          <Text style={styles.groupBtnText}>GRUPO</Text>
        </Pressable>
      </View>

      <FlatList
        inverted
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const mine = item.user_id === user?.id;
          const isWorkoutPost = Boolean(item.workout_id) && item.media_type === 'image';
          return (
            <View
              style={[
                styles.bubble,
                mine ? styles.bubbleMe : styles.bubbleThem,
              ]}
            >
              {!mine ? (
                <Text style={styles.author}>
                  {item.profiles?.display_name ?? 'Amigo'}
                </Text>
              ) : null}
              {item.media_url &&
              (item.media_type === 'image' || item.media_type === 'gif') ? (
                <Image
                  source={{ uri: item.media_url }}
                  style={styles.media}
                  contentFit="cover"
                  recyclingKey={item.id}
                />
              ) : null}
              {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
              {item.link_url ? (
                <Pressable onPress={() => void Linking.openURL(item.link_url!)}>
                  <Text style={styles.link}>{item.link_url}</Text>
                </Pressable>
              ) : null}
              {mine && isWorkoutPost ? (
                <Pressable
                  onPress={() => onDeleteWorkoutPost(item)}
                  hitSlop={8}
                >
                  <Text style={styles.deletePost}>QUITAR REGISTRO</Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ padding: spacing.md }}>
            <EmptyState
              title="Sin mensajes"
              body="Manda texto libre o registra un entrenamiento — aparece aquí con foto."
            />
          </View>
        }
      />

      {showGifs ? (
        <View style={styles.gifPanel}>
          <TextInput
            style={styles.gifSearch}
            placeholder="Buscar GIFs"
            placeholderTextColor={colors.textDim}
            value={gifQuery}
            onChangeText={setGifQuery}
          />
          <FlatList
            horizontal
            data={gifs}
            keyExtractor={(g) => g.id}
            ListEmptyComponent={
              <Muted>No hay GIFs — prueba otra búsqueda.</Muted>
            }
            renderItem={({ item }) => (
              <Pressable
                disabled={sending}
                onPress={() =>
                  void send({
                    media_url: item.url,
                    media_type: 'gif',
                    body: item.title || 'GIF',
                  })
                }
              >
                <Image
                  source={{ uri: item.preview || item.url }}
                  style={styles.gifThumb}
                  contentFit="cover"
                />
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
          placeholder="Mensaje libre…"
          placeholderTextColor={colors.textDim}
          value={text}
          onChangeText={setText}
          multiline
        />
        <Button label="ENVIAR" onPress={() => void onSendText()} loading={sending} />
      </View>

      <Modal visible={showGroup} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Title>GRUPO</Title>
            <Muted>
              {group?.name} · código{' '}
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {group?.invite_code}
              </Text>
            </Muted>
            <Muted>{inviteLink(group?.invite_code ?? '')}</Muted>

            {profile.is_admin ? (
              group?.challenge_started_on ? (
                <Card style={{ gap: 4 }}>
                  <Text style={styles.section}>RETO EN CURSO</Text>
                  <Muted>Inicio grupal: {group.challenge_started_on}</Muted>
                </Card>
              ) : (
                <Button
                  label="COMENZAR RETO"
                  onPress={() => {
                    if (!user) return;
                    Alert.alert(
                      '¿Comenzar el reto?',
                      'Hoy será la fecha de inicio para TODO el grupo. No se puede deshacer.',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Comenzar',
                          style: 'default',
                          onPress: () => {
                            void (async () => {
                              try {
                                const start = await startGroupChallenge(user.id);
                                await refreshChallenge();
                                await load();
                                Alert.alert(
                                  '¡Reto iniciado!',
                                  `Fecha de inicio para todos: ${start}`,
                                );
                              } catch (e) {
                                Alert.alert('Error', (e as Error).message);
                              }
                            })();
                          },
                        },
                      ],
                    );
                  }}
                />
              )
            ) : group?.challenge_started_on ? (
              <Muted>Reto iniciado el {group.challenge_started_on}</Muted>
            ) : (
              <Muted>
                Esperando a que un admin toque COMENZAR RETO para fijar la fecha
                de inicio del grupo.
              </Muted>
            )}

            <Text style={styles.section}>MIEMBROS</Text>
            {leaderboard.map((e) => (
              <View key={e.profile.id} style={styles.memberRow}>
                <Text style={styles.memberName}>
                  {e.profile.display_name}
                  {e.profile.is_admin ? ' · ADMIN' : ''}
                </Text>
                {profile.is_admin && !e.profile.is_admin ? (
                  <Pressable
                    onPress={() => {
                      if (!user) return;
                      Alert.alert(
                        '¿Quitar?',
                        `${e.profile.display_name} saldrá del guardadito.`,
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Quitar',
                            style: 'destructive',
                            onPress: () => {
                              void removeMember(user.id, e.profile.id)
                                .then(() => refreshChallenge())
                                .catch((err) =>
                                  Alert.alert('Error', (err as Error).message),
                                );
                            },
                          },
                        ],
                      );
                    }}
                  >
                    <Text style={styles.remove}>QUITAR</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}

            {profile.is_admin ? (
              <>
                <Field
                  label="Invitar / pendiente"
                  value={ghostName}
                  onChangeText={setGhostName}
                  placeholder="Apodo"
                />
                <Button
                  label="Nota de invitación"
                  variant="secondary"
                  onPress={() => {
                    if (!user || !ghostName.trim()) return;
                    void addGhostMember(user.id, ghostName.trim())
                      .then(() => {
                        setGhostName('');
                        return refreshChallenge();
                      })
                      .catch((e) => Alert.alert('Error', (e as Error).message));
                  }}
                />
              </>
            ) : (
              <Muted>Solo admins agregan o quitan gente.</Muted>
            )}

            <Button label="CERRAR" onPress={() => setShowGroup(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  groupBtn: {
    borderWidth: borderWidth.thick,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  groupBtnText: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.text,
    fontSize: 16,
    letterSpacing: 1,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  bubble: {
    maxWidth: '86%',
    padding: spacing.md,
    borderWidth: borderWidth.thick,
    borderColor: colors.borderMuted,
    gap: 6,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: colors.chatBubbleMe,
    borderColor: colors.accent,
  },
  bubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: colors.chatBubbleThem,
  },
  author: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.accent,
    fontSize: 14,
    letterSpacing: 1,
  },
  body: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
  },
  link: {
    color: colors.accent,
    fontFamily: 'Inter_600SemiBold',
    textDecorationLine: 'underline',
  },
  media: {
    width: 220,
    height: 180,
    backgroundColor: colors.surface,
  },
  deletePost: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.danger,
    fontSize: 13,
    letterSpacing: 1,
    marginTop: 4,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: borderWidth.thick,
    borderTopColor: colors.borderMuted,
    backgroundColor: colors.bgElevated,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderWidth: borderWidth.thick,
    borderColor: colors.borderMuted,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.bg,
    fontFamily: 'Inter_400Regular',
  },
  gifBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: borderWidth.thick,
    borderColor: colors.accent,
  },
  gifBtnText: {
    color: colors.accent,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 16,
  },
  gifPanel: {
    borderTopWidth: borderWidth.thick,
    borderTopColor: colors.borderMuted,
    padding: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.bg,
    maxHeight: 160,
  },
  gifSearch: {
    borderWidth: borderWidth.thick,
    borderColor: colors.borderMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    backgroundColor: colors.bgElevated,
  },
  gifThumb: {
    width: 96,
    height: 96,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.bgElevated,
    borderTopWidth: borderWidth.thick,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    maxHeight: '85%',
  },
  section: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.text,
    fontSize: 20,
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
    paddingVertical: 8,
  },
  memberName: { ...typography.body, color: colors.text },
  remove: {
    color: colors.danger,
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 1,
  },
});
