<script>
  import { onMount } from "svelte";

  let loading = false;
  let error = null;
  let vms = [];
  let sshKeysText = "";
  let showDeployModal = false;
  let showKeysModal = false;
  let copyingId = null;

  async function api(path, options = {}) {
    const url = `/api${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    if (!res.ok && res.status !== 304) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return res.status === 304 ? null : await res.json();
  }

  async function loadData() {
    loading = true;
    error = null;
    try {
      const data = await api("/vm");
      if (data && data.vms) {
        vms = data.vms;
      }
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function loadKeys() {
    try {
      const data = await api("/ssh-keys");
      if (data && data.keys) {
        sshKeysText = data.keys.join("\n");
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function saveKeys() {
    loading = true;
    try {
      const keys = sshKeysText
        .split("\n")
        .map(k => k.trim())
        .filter(k => k.length > 0);
      await api("/ssh-keys", { method: "POST", body: JSON.stringify({ keys }) });
      showKeysModal = false;
    } catch (e) {
      alert(`Failed to save keys: ${e.message}`);
    } finally {
      loading = false;
    }
  }

  async function deployVm() {
    loading = true;
    try {
      await api("/vm", { method: "POST" });
      showDeployModal = false;
      await loadData();
    } catch (e) {
      alert(e.message);
    } finally {
      loading = false;
    }
  }

  async function deleteVm(id) {
    if (!confirm("Terminate this instance?")) return;
    loading = true;
    try {
      await api(`/vm/${id}`, { method: "DELETE" });
      await loadData();
    } catch (e) {
      alert(e.message);
    } finally {
      loading = false;
    }
  }

  function copySsh(ip, id) {
    if (!ip) return;
    navigator.clipboard.writeText(`ssh runner@${ip}`);
    copyingId = id;
    setTimeout(() => { copyingId = null; }, 2000);
  }

  onMount(() => {
    loadData();
    loadKeys();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  });
</script>

<div class="max-w-4xl mx-auto px-4 py-8 min-h-screen flex flex-col justify-between">
  <div>
    <header class="flex items-center justify-between pb-6 mb-8 border-b border-white/10">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold tracking-tight text-white">Free VPC</h1>
        <span class="text-xs px-2 py-0.5 rounded bg-white/5 text-slate-400 mono">Tailscale</span>
      </div>

      <div class="flex items-center gap-2">
        <button on:click={() => { loadKeys(); showKeysModal = true; }} class="btn btn-secondary text-xs">
          SSH Keys
        </button>
        <button on:click={loadData} class="btn btn-secondary text-xs px-2.5" title="Refresh">
          <svg class="w-4 h-4 {loading ? 'animate-spin' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
        <button on:click={() => showDeployModal = true} class="btn btn-primary text-xs">
          + Deploy VM
        </button>
      </div>
    </header>

    {#if error}
      <div class="p-3 mb-6 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex justify-between items-center">
        <span>{error}</span>
        <button on:click={loadData} class="underline">Retry</button>
      </div>
    {/if}

    <main class="space-y-3">
      {#if vms.length === 0}
        <div class="card text-center py-16">
          <p class="text-sm text-slate-400 mb-4">No active instances.</p>
          <button on:click={() => showDeployModal = true} class="btn btn-primary text-xs">
            + Deploy VM
          </button>
        </div>
      {:else}
        {#each vms as vm}
          <div class="card flex items-center justify-between gap-4 p-4 hover:border-white/20">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center font-bold text-slate-300 mono text-xs">
                #{vm.slot_id}
              </div>

              <div>
                <div class="flex items-center gap-3">
                  {#if vm.ip}
                    <span class="mono text-base font-bold text-white tracking-wide">{vm.ip}</span>
                  {:else}
                    <span class="mono text-sm text-amber-400">Assigning IP...</span>
                  {/if}

                  <span class="badge {vm.status === 'running' ? 'badge-online' : 'badge-draining'} text-[10px] py-0 px-1.5">
                    {vm.status}
                  </span>
                </div>
                <div class="text-[11px] text-slate-400 mt-0.5">
                  4 vCPU &middot; 16 GB RAM &middot; Slot {vm.slot_id}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              {#if vm.ip}
                <button 
                  on:click={() => copySsh(vm.ip, vm.id)}
                  class="btn btn-secondary text-xs mono">
                  {copyingId === vm.id ? 'Copied' : `ssh runner@${vm.ip}`}
                </button>
              {/if}

              <button 
                on:click={() => deleteVm(vm.id)}
                class="btn btn-danger text-xs px-2.5" 
                title="Terminate">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </main>
  </div>

  <footer class="pt-8 text-center text-xs text-slate-600">
    Free VPC &middot; Up to 20 dedicated instances
  </footer>

  {#if showDeployModal}
    <div class="modal-backdrop">
      <div class="card max-w-sm w-full space-y-4">
        <h3 class="font-bold text-base text-white">Deploy New Instance</h3>
        <p class="text-xs text-slate-400 leading-relaxed">
          Spawns a dedicated VM with <strong>4 vCPU</strong> and <strong>16 GB RAM</strong> on the next available slot.
        </p>

        <div class="pt-2 flex justify-end gap-2">
          <button on:click={() => showDeployModal = false} class="btn btn-secondary text-xs">Cancel</button>
          <button on:click={deployVm} class="btn btn-primary text-xs" disabled={loading}>
            {loading ? 'Deploying...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showKeysModal}
    <div class="modal-backdrop">
      <div class="card max-w-md w-full space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-base text-white">Authorized SSH Keys</h3>
          <button on:click={() => showKeysModal = false} class="text-slate-400 hover:text-white">✕</button>
        </div>

        <p class="text-xs text-slate-400">
          Keys specified here replicate live to all running instances and VMs within seconds.
        </p>

        <textarea 
          bind:value={sshKeysText} 
          rows="6" 
          placeholder="ssh-ed25519 AAA... (one per line)"
          class="mono text-xs"></textarea>

        <div class="flex justify-end gap-2">
          <button on:click={() => showKeysModal = false} class="btn btn-secondary text-xs">Cancel</button>
          <button on:click={saveKeys} class="btn btn-primary text-xs" disabled={loading}>
            Save & Replicate
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
