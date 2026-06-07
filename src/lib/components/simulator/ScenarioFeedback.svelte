<script lang="ts">
	import { RadioCallsHistoryStore } from '$lib/stores';
	import { Accordion } from '@skeletonlabs/skeleton-svelte';
	import Results from '$lib/logic/Results';
	const results = $derived(new Results($RadioCallsHistoryStore));
</script>

<div class="card p-4 w-9/12">
	{#if results.isEmpty()}
		<p>Something went wrong: No feedback to show</p>
	{:else}
		<Accordion>
			<Accordion.Item open>
				{#snippet lead()}
					🛫
				{/snippet}
				{#snippet summary()}
					Takeoff
				{/snippet}
				{#snippet content()}
					<TreeView hyphenOpacity={'opacity-0'}>
						{#each results.getStartUpAndTaxiCalls() as item}
							<TreeViewItem>
								{item[0].getCurrentScenarioPoint().stage}
								{#snippet children()}
									{#each item as call}
										<div class="">
											{#if call.getFeedback().isFlawless()}
												<TreeViewItem>"{call.getRadioCall()}"</TreeViewItem>
											{:else}
												<TreeViewItem>
													{#if call.getFeedback().getMinorMistakes().length > 0}
														<div class="flex flex-row gap-4 justify-between">
															<div
																class="flex flex-col justify-center items-centerplace-content-center"
															>
																"<span>{call.getRadioCall()}"</span>
															</div>
															<div class="card text-yellow-500 p-2 justify-self-end">
																{call.getFeedback().getTotalMistakes()} Issues
															</div>
														</div>
													{:else}
														<div class="flex flex-row gap-4 justify-between">
															<div
																class="flex flex-col justify-center items-centerplace-content-center"
															>
																<span>"{call.getRadioCall()}"</span>
															</div>
															<div class="card text-red-500 p-2 justify-self-end">
																{call.getFeedback().getTotalMistakes()} Issues
															</div>
														</div>
													{/if}{#snippet children()}
														{#each call.getFeedback().getMinorMistakes() as minorMistake}
															<TreeViewItem
																><span class="text-yellow-500">Minor Error: {minorMistake}</span
																></TreeViewItem
															>
														{/each}
														{#each call.getFeedback().getSevereMistakes() as severeMistake}
															<TreeViewItem
																><span class="text-red-500">Mistake: {severeMistake}</span
																></TreeViewItem
															>
														{/each}
													{/snippet}</TreeViewItem
												>
											{/if}
										</div>
									{/each}
								{/snippet}</TreeViewItem
							>
						{/each}
					</TreeView>
				{/snippet}
			</Accordion.Item>
			<Accordion.Item>
				{#snippet lead()}
					🧭
				{/snippet}
				{#snippet summary()}
					Cross Country Flight
				{/snippet}
				{#snippet content()}
					<TreeView hyphenOpacity={'opacity-0'}>
						{#each results.getAirborneCalls() as item}
							<TreeViewItem>
								{item[0].getCurrentScenarioPoint().stage}
								{#snippet children()}
									{#each item as call}
										<div class="">
											{#if call.getFeedback().isFlawless()}
												<TreeViewItem>"{call.getRadioCall()}"</TreeViewItem>
											{:else}
												<TreeViewItem>
													{#if call.getFeedback().getMinorMistakes().length > 0}
														<div class="flex flex-row gap-4 justify-between">
															<div
																class="flex flex-col justify-center items-centerplace-content-center"
															>
																"<span>{call.getRadioCall()}"</span>
															</div>
															<div class="card text-yellow-500 p-2 justify-self-end">
																{call.getFeedback().getTotalMistakes()} Issues
															</div>
														</div>
													{:else}
														<div class="flex flex-row gap-4 justify-between">
															<div
																class="flex flex-col justify-center items-centerplace-content-center"
															>
																<span>"{call.getRadioCall()}"</span>
															</div>
															<div class="card text-red-500 p-2 justify-self-end">
																{call.getFeedback().getTotalMistakes()} Issues
															</div>
														</div>
													{/if}{#snippet children()}
														{#each call.getFeedback().getMinorMistakes() as minorMistake}
															<TreeViewItem
																><span class="text-yellow-500">Minor Error: {minorMistake}</span
																></TreeViewItem
															>
														{/each}
														{#each call.getFeedback().getSevereMistakes() as severeMistake}
															<TreeViewItem
																><span class="text-red-500">Mistake: {severeMistake}</span
																></TreeViewItem
															>
														{/each}
													{/snippet}</TreeViewItem
												>
											{/if}
										</div>
									{/each}
								{/snippet}</TreeViewItem
							>
						{/each}
					</TreeView>
				{/snippet}
			</Accordion.Item>
			<Accordion.Item>
				{#snippet lead()}
					🛬
				{/snippet}
				{#snippet summary()}
					Landing
				{/snippet}
				{#snippet content()}
					<TreeView hyphenOpacity={'opacity-0'}>
						{#each results.getLandingCalls() as item}
							<TreeViewItem>
								{item[0].getCurrentScenarioPoint().stage}
								{#snippet children()}
									{#each item as call}
										<div class="">
											{#if call.getFeedback().isFlawless()}
												<TreeViewItem>"{call.getRadioCall()}"</TreeViewItem>
											{:else}
												<TreeViewItem>
													{#if call.getFeedback().getMinorMistakes().length > 0}
														<div class="flex flex-row gap-4 justify-between">
															<div
																class="flex flex-col justify-center items-centerplace-content-center"
															>
																"<span>{call.getRadioCall()}"</span>
															</div>
															<div class="card text-yellow-500 p-2 justify-self-end">
																{call.getFeedback().getTotalMistakes()} Issues
															</div>
														</div>
													{:else}
														<div class="flex flex-row gap-4 justify-between">
															<div
																class="flex flex-col justify-center items-centerplace-content-center"
															>
																<span>"{call.getRadioCall()}"</span>
															</div>
															<div class="card text-red-500 p-2 justify-self-end">
																{call.getFeedback().getTotalMistakes()} Issues
															</div>
														</div>
													{/if}{#snippet children()}
														{#each call.getFeedback().getMinorMistakes() as minorMistake}
															<TreeViewItem
																><span class="text-yellow-500">Minor Error: {minorMistake}</span
																></TreeViewItem
															>
														{/each}
														{#each call.getFeedback().getSevereMistakes() as severeMistake}
															<TreeViewItem
																><span class="text-red-500">Mistake: {severeMistake}</span
																></TreeViewItem
															>
														{/each}
													{/snippet}</TreeViewItem
												>
											{/if}
										</div>
									{/each}
								{/snippet}</TreeViewItem
							>
						{/each}
					</TreeView>
				{/snippet}
			</Accordion.Item>
		</Accordion>
	{/if}
</div>

<style>
</style>
