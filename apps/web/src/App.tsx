import { useEffect, useState } from 'react';

export default function App() {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setReady(true);
    }, []);

    return (
        <div data-testid="app-shell">
            {ready ? (
                <p>SACS · Dispatch Simulator — loading...</p>
            ) : null}
        </div>
    );
}