import { useEffect, useState, type ReactNode } from 'react';
import { getJson } from '../api/client.js';

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; items: T[] };

type Props<T> = {
  title: string;
  description: string;
  endpoint: string;
  collectionKey: string;
  emptyMessage: string;
  renderItem: (item: T) => ReactNode;
};

export function CapabilityCard<T>({ title, description, endpoint, collectionKey, emptyMessage, renderItem }: Props<T>) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    getJson<Record<string, T[]>>(endpoint)
      .then((response) => {
        const items = response[collectionKey];
        if (!Array.isArray(items)) throw new Error(`Response is missing ${collectionKey}`);
        if (!cancelled) setState({ status: 'success', items });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [collectionKey, endpoint]);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {state.status === 'loading' && <p role="status">Loading {title.toLowerCase()}...</p>}
        {state.status === 'error' && <p role="alert">Unable to load {title.toLowerCase()}: {state.message}</p>}
        {state.status === 'success' && state.items.length === 0 && <p>{emptyMessage}</p>}
        {state.status === 'success' && state.items.length > 0 && (
          <ul className="list-group list-group-flush">
            {state.items.map((item, index) => <li className="list-group-item" key={index}>{renderItem(item)}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
