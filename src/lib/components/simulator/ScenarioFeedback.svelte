<script lang="ts">
	import { RadioCallsHistoryStore } from '$lib/stores';
	import { Accordion, TreeView, createTreeViewCollection } from '@skeletonlabs/skeleton-svelte';
	import Results from '$lib/logic/Results';
	import type RadioCall from '$lib/logic/RadioCall';

	interface FeedbackNode {
		id: string;
		name: string;
		children?: FeedbackNode[];
		issueCount?: number;
		hasMinorMistakes?: boolean;
		mistakeSeverity?: 'minor' | 'severe';
	}

	interface FeedbackSection {
		id: string;
		label: string;
		icon: string;
		collection: ReturnType<typeof createTreeViewCollection<FeedbackNode>>;
	}

	const results = $derived(new Results($RadioCallsHistoryStore));

	function callToNode(call: RadioCall, id: string): FeedbackNode {
		if (call.getFeedback().isFlawless()) {
			return { id, name: `"${call.getRadioCall()}"` };
		}

		const minorMistakes = call.getFeedback().getMinorMistakes();
		const severeMistakes = call.getFeedback().getSevereMistakes();

		return {
			id,
			name: call.getRadioCall(),
			issueCount: call.getFeedback().getTotalMistakes(),
			hasMinorMistakes: minorMistakes.length > 0,
			children: [
				...minorMistakes.map((mistake, index) => ({
					id: `${id}-minor-${index}`,
					name: mistake,
					mistakeSeverity: 'minor' as const
				})),
				...severeMistakes.map((mistake, index) => ({
					id: `${id}-severe-${index}`,
					name: mistake,
					mistakeSeverity: 'severe' as const
				}))
			]
		};
	}

	function groupsToNodes(groups: RadioCall[][], prefix: string): FeedbackNode[] {
		return groups.map((item, groupIndex) => ({
			id: `${prefix}-stage-${groupIndex}`,
			name: item[0].getCurrentScenarioPoint().stage,
			children: item.map((call, callIndex) =>
				callToNode(call, `${prefix}-call-${groupIndex}-${callIndex}`)
			)
		}));
	}

	function createFeedbackCollection(groups: RadioCall[][], prefix: string) {
		return createTreeViewCollection<FeedbackNode>({
			nodeToValue: (node) => node.id,
			nodeToString: (node) => node.name,
			rootNode: {
				id: `${prefix}-root`,
				name: '',
				children: groupsToNodes(groups, prefix)
			}
		});
	}

	const sections = $derived<FeedbackSection[]>([
		{
			id: 'takeoff',
			label: 'Takeoff',
			icon: '🛫',
			collection: createFeedbackCollection(results.getStartUpAndTaxiCalls(), 'takeoff')
		},
		{
			id: 'cross-country',
			label: 'Cross Country Flight',
			icon: '🧭',
			collection: createFeedbackCollection(results.getAirborneCalls(), 'cross-country')
		},
		{
			id: 'landing',
			label: 'Landing',
			icon: '🛬',
			collection: createFeedbackCollection(results.getLandingCalls(), 'landing')
		}
	]);
</script>

<div class="w-9/12 card p-4">
	{#if results.isEmpty()}
		<p>Something went wrong: No feedback to show</p>
	{:else}
		<Accordion multiple defaultValue={['takeoff']}>
			{#each sections as section, index (section.id)}
				{#if index !== 0}
					<hr class="hr" />
				{/if}
				<Accordion.Item value={section.id}>
					<h3>
						<Accordion.ItemTrigger class="flex items-center justify-between gap-2 font-bold">
							<span>{section.icon} {section.label}</span>
							<Accordion.ItemIndicator />
						</Accordion.ItemTrigger>
					</h3>
					<Accordion.ItemContent>
						{#if section.collection.rootNode.children?.length}
							<TreeView collection={section.collection}>
								<TreeView.Tree>
									{#each section.collection.rootNode.children as node, nodeIndex (node.id)}
										{@render feedbackNode(node, [nodeIndex])}
									{/each}
								</TreeView.Tree>
							</TreeView>
						{:else}
							<p class="text-sm opacity-70">No calls in this phase.</p>
						{/if}
					</Accordion.ItemContent>
				</Accordion.Item>
			{/each}
		</Accordion>
	{/if}
</div>

{#snippet feedbackNode(node: FeedbackNode, indexPath: number[])}
	<TreeView.NodeProvider value={{ node, indexPath }}>
		{#if node.children}
			<TreeView.Branch>
				<TreeView.BranchControl>
					<TreeView.BranchIndicator />
					<TreeView.BranchText>
						{#if node.issueCount !== undefined}
							<div class="flex w-full flex-row justify-between gap-4">
								<span>"{node.name}"</span>
								<span class="card p-2 {node.hasMinorMistakes ? 'text-yellow-500' : 'text-red-500'}">
									{node.issueCount} Issues
								</span>
							</div>
						{:else}
							{node.name}
						{/if}
					</TreeView.BranchText>
				</TreeView.BranchControl>
				<TreeView.BranchContent>
					<TreeView.BranchIndentGuide />
					{#each node.children as childNode, childIndex (childNode.id)}
						{@render feedbackNode(childNode, [...indexPath, childIndex])}
					{/each}
				</TreeView.BranchContent>
			</TreeView.Branch>
		{:else if node.mistakeSeverity}
			<TreeView.Item>
				<span class={node.mistakeSeverity === 'minor' ? 'text-yellow-500' : 'text-red-500'}>
					{node.mistakeSeverity === 'minor' ? 'Minor Error' : 'Mistake'}: {node.name}
				</span>
			</TreeView.Item>
		{:else}
			<TreeView.Item>{node.name}</TreeView.Item>
		{/if}
	</TreeView.NodeProvider>
{/snippet}
