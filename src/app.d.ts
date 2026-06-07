// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface Window {
		SpeechRecognition?: new () => SpeechRecognition;
		webkitSpeechRecognition?: new () => SpeechRecognition;
	}

	// Web Speech API (not included in all TypeScript lib targets)
	interface SpeechRecognition extends EventTarget {
		lang: string;
		onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
		start(): void;
		stop(): void;
	}
}

export {};
