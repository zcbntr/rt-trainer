import type { Component } from 'svelte';

export type AlertDialogOptions = {
	type: 'alert';
	title: string;
	body: string;
};

export type ConfirmDialogOptions = {
	type: 'confirm';
	title: string;
	body: string;
	response?: (confirmed: boolean) => void;
};

export type ComponentDialogOptions = {
	type: 'component';
	component: Component;
	props?: Record<string, unknown>;
	response?: (result: unknown) => void;
};

export type DialogOptions = AlertDialogOptions | ConfirmDialogOptions | ComponentDialogOptions;

class DialogState {
	open = $state(false);
	options = $state<DialogOptions | null>(null);

	trigger(options: DialogOptions): void {
		this.options = options;
		this.open = true;
	}

	close(result?: unknown): void {
		const current = this.options;
		if (!current) return;

		if (current.type === 'confirm' && current.response) {
			current.response(Boolean(result));
		} else if (current.type === 'component' && current.response) {
			current.response(result);
		}

		this.options = null;
		this.open = false;
	}

	dismiss(): void {
		const current = this.options;
		if (!current) {
			this.open = false;
			return;
		}

		if (current.type === 'confirm' && current.response) {
			current.response(false);
		} else if (current.type === 'component' && current.response) {
			current.response(undefined);
		}

		this.options = null;
		this.open = false;
	}

	onOpenChange(details: { open: boolean }): void {
		if (details.open) {
			this.open = true;
			return;
		}

		if (this.options) {
			this.dismiss();
		} else {
			this.open = false;
		}
	}
}

export const dialog = new DialogState();
