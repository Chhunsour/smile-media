import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { Button, Card, Text } from '@/components/ui';
import { services } from '@/services';
import type { FacebookPostResponse } from '@/services/types';

type Snapshot = Extract<FacebookPostResponse, { state: string }>;

export function FacebookPost({ postId, pageId, pageName }: { postId: string; pageId: string; pageName: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const provider = services.publishing;
  if (!provider.facebookPost) return null;
  const load = async () => {
    setBusy(true); setNote(''); setSnapshot(undefined);
    try {
      const result = await provider.facebookPost!(postId, pageId, { operation: 'read' });
      if (!('state' in result)) throw new Error('The current Facebook post could not be loaded.');
      setSnapshot(result); setCaption(result.message ?? '');
    } catch (error) { setNote(error instanceof Error ? error.message : 'The Facebook post could not be loaded.'); }
    finally { setBusy(false); }
  };
  const change = async (operation: 'edit' | 'delete') => {
    if (!snapshot?.requestId || !snapshot.canManage || busy) return;
    setBusy(true); setNote('');
    try {
      const result = await provider.facebookPost!(postId, pageId, operation === 'edit'
        ? { operation, requestId: snapshot.requestId, message: caption }
        : { operation, requestId: snapshot.requestId, confirm: 'DELETE_FROM_FACEBOOK' });
      if (!('success' in result) || !result.success) throw new Error('error' in result ? result.error?.message : 'Facebook did not confirm the change.');
      await load();
    } catch (error) {
      setSnapshot(undefined);
      setNote(error instanceof Error ? error.message : 'The result is uncertain. Check Facebook before another change.');
    } finally { setBusy(false); }
  };
  return <Card className="mx-5 mt-4 gap-3 p-4">
    <Text variant="callout" className="font-semibold">Facebook · {pageName}</Text>
    <Text variant="caption" tone="muted">Read the current content from Facebook. Changes here affect this Page only; your saved composition stays in history.</Text>
    <Button title={snapshot ? 'Refresh from Facebook' : 'Load Facebook post'} variant="secondary" size="md" loading={busy} onPress={load} />
    {snapshot ? <>
      <Text variant="caption" tone="muted" selectable>Facebook post ID: {snapshot.id}</Text>
      {snapshot.state === 'deleted' ? <Text>This post was deleted from Facebook with confirmation.</Text> : <>
        <Text selectable>{snapshot.message || 'This post has no text caption.'}</Text>
        {snapshot.url ? <Button title="View on Facebook" variant="secondary" size="md" onPress={() => Linking.openURL(snapshot.url!).catch(() => setNote('The Facebook link could not be opened.'))} /> : null}
        {snapshot.state === 'uncertain' ? <Text tone="danger">A previous change has an uncertain result. Check the Page; another change is blocked.</Text> : null}
        {snapshot.canManage ? <View className="gap-3">
          <TextInput accessibilityLabel={`Updated caption for ${pageName}`} value={caption} onChangeText={setCaption} multiline maxLength={10000} className="min-h-24 rounded-xl border border-line bg-bg p-3 text-fg" />
          <Button title="Update caption on Facebook" size="md" disabled={busy || !caption.trim() || caption === snapshot.message} onPress={() => Alert.alert(`Update ${pageName} on Facebook?`, 'This changes the text of the published post on this Page.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Update on Facebook', onPress: () => change('edit') }])} />
          <Button title="Delete from Facebook" variant="secondary" size="md" disabled={busy} onPress={() => Alert.alert(`Delete from ${pageName} on Facebook?`, 'This permanently deletes the actual Facebook post from this Page. Other destinations and your local history remain.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete from Facebook', style: 'destructive', onPress: () => change('delete') }])} />
        </View> : snapshot.state === 'available' ? <Text variant="caption" tone="muted">Editing and deletion are unavailable in this release.</Text> : null}
      </>}
    </> : null}
    {note ? <Text tone="danger">{note}</Text> : null}
  </Card>;
}
