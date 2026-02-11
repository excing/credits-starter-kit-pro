/**
 * Admin 共享工具：操作状态跟踪 + 剪贴板
 */

import { toast } from 'svelte-sonner';

export class AdminShared {
	// 单项操作状态：记录正在操作的 item id
	operatingItems = $state<Set<string>>(new Set());

	isOperating(id: string): boolean {
		return this.operatingItems.has(id);
	}

	startOperation(id: string) {
		this.operatingItems = new Set([...this.operatingItems, id]);
	}

	endOperation(id: string) {
		const newSet = new Set(this.operatingItems);
		newSet.delete(id);
		this.operatingItems = newSet;
	}

	async copyToClipboard(text: string): Promise<boolean> {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
		} else {
			const textarea = document.createElement('textarea');
			textarea.value = text;
			textarea.style.position = 'fixed';
			textarea.style.opacity = '0';
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
		}
		return true;
	}

	async copyCode(code: string) {
		try {
			await this.copyToClipboard(code);
			toast.success('已复制到剪贴板');
			return true;
		} catch {
			toast.error('复制失败');
			return false;
		}
	}
}

export const adminShared = new AdminShared();
