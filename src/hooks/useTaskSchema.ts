import { useState, useEffect } from 'react';
import { TaskSchema } from '../types';
import { subscribeTaskSchema, DEFAULT_TASK_SCHEMA } from '../services/noteSchemaService';

/** Real-time hook for the task form schema */
export function useTaskSchema(): { schema: TaskSchema; loading: boolean } {
  const [schema, setSchema] = useState<TaskSchema>(DEFAULT_TASK_SCHEMA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeTaskSchema((s) => {
      setSchema(s);
      setLoading(false);
    });
    return () => {
      unsub();
    };
  }, []);

  return { schema, loading };
}
