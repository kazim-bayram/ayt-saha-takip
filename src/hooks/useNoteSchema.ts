import { useState, useEffect } from 'react';
import { NoteSchema } from '../types';
import { subscribeNoteSchema, DEFAULT_NOTE_SCHEMA } from '../services/noteSchemaService';

/** Real-time hook for the note form schema */
export function useNoteSchema(): { schema: NoteSchema; loading: boolean } {
  const [schema, setSchema] = useState<NoteSchema>(DEFAULT_NOTE_SCHEMA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeNoteSchema((s) => {
      setSchema(s);
      setLoading(false);
    });
    return () => {
      unsub();
    };
  }, []);

  return { schema, loading };
}
