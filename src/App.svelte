<script>
  import { onMount } from "svelte";

  let apiUrl = localStorage.getItem("freevpc_api_url") || "https://api.unsafie.com";
  let clientId = localStorage.getItem("freevpc_client_id") || "5a06f20e534be12f4e259e932af57b57.access";
  let clientSecret = localStorage.getItem("freevpc_client_secret") || "cfast_clJJ6Rx6HA0bdn2eXV31EO7UNnApjsLaOOdkWCMe71e2052a";

  let loading = false;
  let error = null;
  let statusData = { target: 20, active_runners: 0, total_vms: 0, runners: [], vms: [] };
  let activeTab = "vms";

  let showDeployModal = false;
  let showSettingsModal = false;
  let copyingKey = null;

  let newVm = {
    name: "",
    slot_id: 1,
    vcpus: 2,
    memory_mb: 2048,
    disk_gb: 20,
    image: "debian-12-minimal",
    ssh_key: ""
  };

  async function apiRequest(endpoint, options = {}) {
    const url = `${apiUrl.replace(/\/$/, "")}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "CF-Access-Client-Id": clientId,
      "CF-Access-Client-Secret": clientSecret,
      ...(options.headers || {})
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok && res.status !== 304) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}: ${res.statusText}`);
    }
    return res.status === 304 ? null : await res.json();
  }

  async function refreshData() {
    loading = true;
    error = null;
    try {
      const data = await apiRequest("/status");
      if (data) statusData = data;
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function createVm() {
    if (!newVm.name) return;
    loading = true;
    try {
      const payload = {
        name: newVm.name,
        slot_id: parseInt(newVm.slot_id, 10),
        vcpus: parseInt(newVm.vcpus, 10),
        memory_mb: parseInt(newVm.memory_mb, 10),
        disk_gb: parseInt(newVm.disk_gb, 10),
        image: newVm.image,
        ssh_keys: newVm.ssh_key ? [newVm.ssh_key] : []
      };
      await apiRequest("/v1/vms", { method: "POST", body: JSON.stringify(payload) });
      showDeployModal = false;
      newVm.name = "";
      await refreshData();
    } catch (e) {
      alert(`Failed to create VM: ${e.message}`);
    } finally {
      loading = false;
    }
  }

  async function deleteVm(id, name) {
    if (!confirm(`Are you sure you want to terminate micro-VM "${name}"?`)) return;
    loading = true;
    try {
      await apiRequest(`/v1/vms/${id}`, { method: "DELETE" });
      await refreshData();
    } catch (e) {
      alert(`Delete failed: ${e.message}`);
    } finally {
      loading = false;
    }
  }

  async function triggerBatchSpawn() {
    loading = true;
    try {
      await apiRequest("/spawn", { method: "POST" });
      await refreshData();
    } catch (e) {
      alert(`Spawn failed: ${e.message}`);
    } finally {
      loading = false;
    }
  }

  function saveSettings() {
    localStorage.setItem("freevpc_api_url", apiUrl);
    localStorage.setItem("freevpc_client_id", clientId);
    localStorage.setItem("freevpc_client_secret", clientSecret);
    showSettingsModal = false;
    refreshData();
  }

  function copyText(text, key) {
    navigator.clipboard.writeText(text);
    copyingKey = key;
    setTimeout(() => { copyingKey = null; }, 2000);
  }

  onMount(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  });
</script>

<div class="min-h-screen pb-16">
  <header class="border-b border-white/5 bg-slate-950/40 backdrop-blur-xl sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
            <line x1="6" y1="6" x2="6.01" y2="6"></line>
            <line x1="6" y1="18" x2="6.01" y2="18"></line>
          </svg>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-lg tracking-tight">Free VPC</span>
            <span class="badge badge-online text-[10px] py-0 px-1.5">v0.1.0</span>
          </div>
          <span class="text-xs text-slate-400 block -mt-0.5">Cloudflare Zero Trust & Firecracker Fleet</span>
        </div>
      </div>

      <div class="flex items-center gap-2 sm:gap-3">
        <button on:click={() => showSettingsModal = true} class="btn btn-secondary text-xs px-2.5 py-1.5" title="API Settings">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        <button on:click={refreshData} class="btn btn-secondary text-xs px-2.5 py-1.5" disabled={loading}>
          <svg class="w-4 h-4 {loading ? 'animate-spin' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
        <button on:click={() => showDeployModal = true} class="btn btn-primary text-xs sm:text-sm">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Deploy VM
        </button>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
    {#if error}
      <div class="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
        <button on:click={() => showSettingsModal = true} class="underline hover:text-white">Check Settings</button>
      </div>
    {/if}

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      <div class="card">
        <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Active Runners</span>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-extrabold text-white">{statusData.active_runners}</span>
          <span class="text-xs text-slate-500">/ {statusData.target} max</span>
        </div>
      </div>
      <div class="card">
        <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Total MicroVMs</span>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-extrabold text-blue-400">{statusData.total_vms}</span>
          <span class="text-xs text-slate-500">instances</span>
        </div>
      </div>
      <div class="card">
        <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">VPC Subnet</span>
        <span class="text-lg sm:text-xl font-bold mono text-emerald-400 block truncate">10.2.0.0/16</span>
        <span class="text-[11px] text-slate-500">Private CIDR</span>
      </div>
      <div class="card">
        <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Fleet Capacity</span>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-extrabold text-amber-400">{statusData.active_runners * 16} GB</span>
          <span class="text-xs text-slate-500">RAM pool</span>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
      <div class="flex items-center gap-1 sm:gap-2">
        <button 
          class="btn text-xs sm:text-sm {activeTab === 'vms' ? 'btn-primary' : 'btn-secondary'}"
          on:click={() => activeTab = 'vms'}>
          MicroVMs ({statusData.total_vms})
        </button>
        <button 
          class="btn text-xs sm:text-sm {activeTab === 'runners' ? 'btn-primary' : 'btn-secondary'}"
          on:click={() => activeTab = 'runners'}>
          Runners & Zones ({statusData.runners.length})
        </button>
        <button 
          class="btn text-xs sm:text-sm {activeTab === 'guide' ? 'btn-primary' : 'btn-secondary'}"
          on:click={() => activeTab = 'guide'}>
          Connectivity Guide
        </button>
      </div>

      {#if activeTab === 'runners'}
        <button on:click={triggerBatchSpawn} class="btn btn-secondary text-xs" disabled={loading}>
          ⚡ Batch Spawn 20 Nodes
        </button>
      {/if}
    </div>

    {#if activeTab === 'vms'}
      {#if statusData.vms.length === 0}
        <div class="card text-center py-16 border-dashed">
          <div class="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
          </div>
          <h3 class="text-base font-bold text-white mb-1">No MicroVMs Deployed</h3>
          <p class="text-xs text-slate-400 max-w-sm mx-auto mb-6">Launch your first Firecracker micro-VM with hardware KVM acceleration and isolated Private CIDR routing.</p>
          <button on:click={() => showDeployModal = true} class="btn btn-primary text-sm">
            Launch First VM
          </button>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each statusData.vms as vm}
            <div class="card flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-3">
                  <span class="font-bold text-base text-white truncate">{vm.name}</span>
                  <span class="badge badge-online">
                    <span class="pulse-dot"></span>
                    {vm.status}
                  </span>
                </div>

                <div class="space-y-2 mb-4 text-xs">
                  <div class="flex items-center justify-between p-2 rounded bg-black/30 border border-white/5">
                    <span class="text-slate-400">Private IP</span>
                    <span class="mono font-bold text-emerald-400">{vm.ip}</span>
                  </div>
                  <div class="flex items-center justify-between p-2 rounded bg-black/30 border border-white/5">
                    <span class="text-slate-400">Assigned Host</span>
                    <span class="mono text-blue-400">{vm.runner_id} (Slot {vm.slot_id})</span>
                  </div>
                  <div class="grid grid-cols-3 gap-2 text-center">
                    <div class="p-1.5 rounded bg-black/20 border border-white/5">
                      <span class="text-[10px] text-slate-500 block uppercase">vCPUs</span>
                      <span class="font-bold text-slate-200">{vm.vcpus}</span>
                    </div>
                    <div class="p-1.5 rounded bg-black/20 border border-white/5">
                      <span class="text-[10px] text-slate-500 block uppercase">RAM</span>
                      <span class="font-bold text-slate-200">{vm.memory_mb} MB</span>
                    </div>
                    <div class="p-1.5 rounded bg-black/20 border border-white/5">
                      <span class="text-[10px] text-slate-500 block uppercase">Disk</span>
                      <span class="font-bold text-slate-200">{vm.disk_gb} GB</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                <button 
                  on:click={() => copyText(`ssh runner@${vm.ip}`, vm.id)}
                  class="btn btn-secondary text-xs flex-1">
                  {copyingKey === vm.id ? 'Copied!' : 'Copy SSH Command'}
                </button>
                <button 
                  on:click={() => deleteVm(vm.id, vm.name)}
                  class="btn btn-danger text-xs px-2.5" 
                  title="Destroy VM">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}

    {#if activeTab === 'runners'}
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {#each Array(20) as _, i}
          {@const slotId = i + 1}
          {@const runner = statusData.runners.find(r => r.slot_id === slotId)}
          {@const isOnline = runner && runner.status === 'online'}
          <div class="card {isOnline ? 'border-emerald-500/20' : 'opacity-60'}">
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-sm text-slate-200">Runner Slot #{slotId}</span>
              <span class="badge {isOnline ? 'badge-online' : 'badge-offline'}">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div class="text-[11px] space-y-1 text-slate-400 mono">
              <div>Subnet: <span class="text-slate-300">10.2.{slotId - 1}.0/24</span></div>
              <div>Gateway: <span class="text-slate-300">10.2.{slotId - 1}.1</span></div>
              <div>Zone: <span class="text-blue-400">az-{slotId}</span></div>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if activeTab === 'guide'}
      <div class="card max-w-3xl mx-auto space-y-6 text-sm">
        <div>
          <h3 class="text-lg font-bold text-white mb-2">How to Connect to Free VPC</h3>
          <p class="text-slate-400 text-xs leading-relaxed">
            All micro-VMs in your Free VPC cluster operate in the isolated <code class="text-emerald-400">10.2.0.0/16</code> subnet.
            Traffic is routed through Cloudflare Zero Trust over HTTP/2 tunnels.
          </p>
        </div>

        <div class="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
          <span class="font-bold text-xs uppercase tracking-wider text-blue-400 block">Option 1: From Linux / macOS with Cloudflare WARP</span>
          <p class="text-xs text-slate-300">Ensure Cloudflare One (WARP) is connected to organization <code class="text-white">shy-resonance-71c0</code> in Include mode, then connect directly by IP:</p>
          <pre class="p-3 rounded bg-black/60 text-xs mono text-emerald-400 overflow-x-auto">ssh runner@10.2.0.2</pre>
        </div>

        <div class="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
          <span class="font-bold text-xs uppercase tracking-wider text-emerald-400 block">Option 2: Without VPN (Via Cloudflare Tunnel Access)</span>
          <p class="text-xs text-slate-300">Connect using the Cloudflare Access ProxyCommand configured in your <code class="text-white">~/.ssh/config</code>:</p>
          <pre class="p-3 rounded bg-black/60 text-xs mono text-emerald-400 overflow-x-auto">ssh -o ProxyCommand="cloudflared access ssh --hostname node-1.unsafie.com" runner@node-1.unsafie.com</pre>
        </div>
      </div>
    {/if}
  </main>

  {#if showDeployModal}
    <div class="modal-backdrop">
      <div class="card max-w-md w-full">
        <div class="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
          <h3 class="font-bold text-base text-white">Deploy MicroVM</h3>
          <button on:click={() => showDeployModal = false} class="text-slate-400 hover:text-white">✕</button>
        </div>

        <form on:submit|preventDefault={createVm} class="space-y-4 text-xs">
          <div>
            <label class="block text-slate-400 font-semibold mb-1">Instance Name</label>
            <input type="text" bind:value={newVm.name} placeholder="e.g. dev-service-1" required />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-400 font-semibold mb-1">Runner Slot (AZ)</label>
              <select bind:value={newVm.slot_id}>
                {#each Array(20) as _, i}
                  <option value={i + 1}>Runner #{i + 1} (10.2.{i}.0/24)</option>
                {/each}
              </select>
            </div>
            <div>
              <label class="block text-slate-400 font-semibold mb-1">Base OS Image</label>
              <select bind:value={newVm.image}>
                <option value="debian-12-minimal">Debian 12 Minimal (ext4)</option>
                <option value="alpine-3.20">Alpine Linux (musl)</option>
                <option value="ubuntu-24.04">Ubuntu 24.04 LTS</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-slate-400 font-semibold mb-1">vCPUs</label>
              <select bind:value={newVm.vcpus}>
                <option value={1}>1 Core</option>
                <option value={2}>2 Cores</option>
                <option value={4}>4 Cores</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-400 font-semibold mb-1">RAM (MB)</label>
              <select bind:value={newVm.memory_mb}>
                <option value={1024}>1024 MB</option>
                <option value={2048}>2048 MB</option>
                <option value={4096}>4096 MB</option>
                <option value={8192}>8192 MB</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-400 font-semibold mb-1">Disk</label>
              <select bind:value={newVm.disk_gb}>
                <option value={10}>10 GB</option>
                <option value={20}>20 GB</option>
                <option value={30}>30 GB</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-slate-400 font-semibold mb-1">Authorized SSH Key (Optional)</label>
            <input type="text" bind:value={newVm.ssh_key} placeholder="ssh-ed25519 AAA..." />
          </div>

          <div class="pt-4 border-t border-white/5 flex items-center justify-end gap-2">
            <button type="button" on:click={() => showDeployModal = false} class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary" disabled={loading}>
              {loading ? 'Deploying...' : 'Deploy Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  {#if showSettingsModal}
    <div class="modal-backdrop">
      <div class="card max-w-md w-full">
        <div class="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
          <h3 class="font-bold text-base text-white">API & Authentication Settings</h3>
          <button on:click={() => showSettingsModal = false} class="text-slate-400 hover:text-white">✕</button>
        </div>

        <form on:submit|preventDefault={saveSettings} class="space-y-4 text-xs">
          <div>
            <label class="block text-slate-400 font-semibold mb-1">Orchestrator API Endpoint</label>
            <input type="text" bind:value={apiUrl} required />
          </div>
          <div>
            <label class="block text-slate-400 font-semibold mb-1">CF Access Client ID</label>
            <input type="text" bind:value={clientId} required />
          </div>
          <div>
            <label class="block text-slate-400 font-semibold mb-1">CF Access Client Secret</label>
            <input type="password" bind:value={clientSecret} required />
          </div>

          <div class="pt-4 border-t border-white/5 flex items-center justify-end gap-2">
            <button type="button" on:click={() => showSettingsModal = false} class="btn btn-secondary">Close</button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>
