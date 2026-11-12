import { ImageResponse } from 'next/og';

export const alt = 'Quizi — Active Recall & Spaced Repetition Flashcards';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
    return new ImageResponse(
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: 80,
                background: '#FDFBF7',
                color: '#1c1917',
            }}
        >
            <div style={{ fontSize: 96, fontWeight: 800, color: '#8BC34A' }}>
                Quizi
            </div>
            <div style={{ fontSize: 56, fontWeight: 700, marginTop: 24 }}>
                Remember more with spaced repetition flashcards
            </div>
            <div style={{ fontSize: 32, marginTop: 24, color: '#57534e' }}>
                FSRS scheduling · Test suites · Live quizzes
            </div>
        </div>,
        { ...size }
    );
}
