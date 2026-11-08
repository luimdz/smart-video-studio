"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowRight, BookOpen, Check, Clapperboard, Clock3, Film, FolderOpen, LayoutDashboard, Link2, Loader2, Menu, Plus, RefreshCw, Settings2, ShieldCheck, Sparkles, Users, Wallet, X } from "lucide-react";
import type { Account, Production, Profile } from "@/lib/server";
import type { Limits } from "@/lib/domain";

type Studio = {
  user: { name: string; email: string; master: boolean };
  accounts: Account[]; profiles: Profile[]; productions: Production[];
  usage: { account_id: string; seconds: number; cents: number }[];
  plans: Record<string, Limits>;
  members: { id: string; account_id: string; email: string; role: string; user_id: string | null }[];
  connections: Record<string, boolean>; period: string;
};
type Tab = "home" | "create" | "profiles" | "productions" | "accounts" | "plans" | "connections";
const money = (cents: number) => new Intl.NumberFormat("es-GT", { style: "currency", currency: "USD" }).format(cents / 100);
const planName = (value: string) => ({ basic: "Básico", pro: "Pro", unlimited: "Unlimited" }[value] || value);
const statusName = (value: string) => ({ draft: "Guardada", queued: "En cola", planning: "Planificando", writing: "Escribiendo", scripts_ready: "Guiones listos", dispatch_unknown: "Revisar conexión", failed: "Requiere atención", ready: "Temporada lista" }[value] || value);
const titles: Record<Tab, [string, string]> = {
  home: ["Tu próxima gran historia empieza aquí.", "Un espacio para todas tus marcas. Una sola forma de crear."],
  create: ["Dale forma a tu próxima producción.", "Configura una pieza o una temporada completa desde una sola solicitud."],
  profiles: ["Cada marca, su propio universo.", "Identidad, audiencia y contexto para cada página o cliente."],
  productions: ["Historias que merecen continuar.", "Tus videos y temporadas, con su estado real de producción."],
  accounts: ["Todo tu estudio, bajo control.", "Cuentas internas y de clientes, permisos y presupuestos."],
  plans: ["El espacio que cada cuenta necesita.", "Límites iniciales editables. Sin precios comerciales definidos todavía."],
  connections: ["Conecta las piezas de tu estudio.", "La producción se habilita al conectar los servicios necesarios."],
};

export default function StudioPage() {
  const [data, setData] = useState<Studio | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false); const [login, setLogin] = useState(false); const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState<"profile" | "account" | "limits" | "member" | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);
  const [plan, setPlan] = useState("basic"); const [limits, setLimits] = useState<Limits | null>(null);
  const [type, setType] = useState("series"); const requestKey = useRef("");
  async function load() {
    setError("");
    try {
      const r = await fetch("/api/studio", { cache: "no-store" }); const body = await r.json() as Studio & { error?: string };
      if (r.status === 401) { setLogin(true); return; }
      if (!r.ok) throw new Error(body.error);
      setData(body); setAccountId(v => v || body.accounts[0]?.id || "");
    } catch(e) { setError(e instanceof Error ? e.message : "No se pudo cargar el estudio."); }
  }
  useEffect(() => { void load(); }, []);
  async function mutate(payload: Record<string, unknown>): Promise<Studio> {
    const r = await fetch("/api/studio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await r.json() as Studio & { error?: string; issues?: { message: string }[] };
    if (!r.ok) throw new Error(body.issues?.[0]?.message || body.error || "No se pudo guardar.");
    setData(body); return body;
  }
  async function execute(payload: Record<string, unknown>, message: string) {
    setBusy(true); setError(""); setNotice("");
    try { await mutate(payload); setNotice(message); setModal(null); }
    catch(e) { setError(e instanceof Error ? e.message : "No se pudo completar."); }
    finally { setBusy(false); }
  }
  function navigate(next: Tab) { setTab(next); setMenu(false); setError(""); setNotice(""); }
  const account = data?.accounts.find(a => a.id === accountId);
  const profiles = data?.profiles.filter(p => p.account_id === accountId) || [];
  const jobs = data?.productions.filter(p => p.account_id === accountId) || [];
  const usage = data?.usage.find(u => u.account_id === accountId);
  const accountLimits: Limits | null = account ? JSON.parse(account.limits) : null;
  function openLimits(a: Account) { setEditing(a); setPlan(a.plan); setLimits(JSON.parse(a.limits)); setModal("limits"); }
  function saveForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget));
    if (modal === "profile") void execute({ action: "profile.create", accountId, ...f }, "Perfil creado. Ya puedes preparar contenido para esta marca.");
    if (modal === "account") void execute({ action: "account.create", ...f, email: f.email || undefined }, "Cuenta creada con su plan y presupuesto.");
    if (modal === "limits") void execute({ action: "account.update", id: editing?.id, plan, limits, status: f.status }, "Plan y límites actualizados.");
    if (modal === "member") void execute({ action: "member.add", accountId: editing?.id, ...f }, "Permiso registrado. El portal externo sigue cerrado durante la fase interna.");
  }
  async function createProduction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); setBusy(true); setError(""); setNotice("");
    requestKey.current ||= crypto.randomUUID();
    try {
      const result = await mutate({ ...f, action: "production.create", type, episodes: type === "series" ? Number(f.episodes) : 1, duration: Number(f.duration), budgetCents: Math.round(Number(f.budget) * 100), requestKey: requestKey.current });
      const created = result.productions.find(p => (p as Production & { request_key?: string }).request_key === requestKey.current);
      requestKey.current = "";
      if (result.connections.n8n && created) { await mutate({ action: "production.dispatch", id: created.id }); setNotice("Solicitud enviada a n8n. Puedes seguir su estado aquí."); }
      else setNotice("Solicitud guardada. Falta conectar n8n para iniciar; no se han consumido créditos.");
      setTab("productions");
    } catch(e) { setError(e instanceof Error ? e.message : "No se pudo guardar."); }
    finally { setBusy(false); }
  }
  const nav: [Tab, typeof Film, string][] = [["home", LayoutDashboard, "Mi estudio"], ["create", Clapperboard, "Crear contenido"], ["productions", BookOpen, "Producciones"], ["profiles", FolderOpen, "Perfiles de marca"]];
  const admin: [Tab, typeof Film, string][] = [["accounts", Users, "Cuentas y usuarios"], ["plans", Settings2, "Planes y límites"], ["connections", Link2, "Conexiones"]];
  const renderJobs = (rows: Production[]) => rows.length ? <div className="production-list">{rows.map(p => <article className="production-row" key={p.id}>
    <span className={`production-art ${p.style}`}><Clapperboard size={25}/></span>
    <div className="production-info"><h3>{p.title}</h3><p>{data?.profiles.find(b => b.id === p.profile_id)?.name} · {p.type === "series" ? `${p.episodes} capítulos` : p.type === "vsl" ? "Micro VSL" : "Video individual"} · {p.duration} s · {p.style === "2d" ? "2D reutilizable" : "Imágenes con movimiento"}</p>{p.error && <small className="field-error">{p.error}</small>}</div>
    <div className="production-status"><span className={`status-badge ${p.status === "scripts_ready" || p.status === "ready" ? "good" : ""}`}>{statusName(p.status)}</span><small>Tope: {money(p.budget_cents)}</small></div>
    {p.status === "draft" ? <button className="icon-button" title={data?.connections.n8n ? "Enviar a n8n" : "Conecta n8n para iniciar"} aria-label="Enviar a n8n" disabled={!data?.connections.n8n || busy} onClick={() => void execute({ action: "production.dispatch", id: p.id }, "Solicitud enviada a n8n.")}><ArrowRight size={19}/></button> : <a className="icon-button" href={`/api/export?id=${p.id}`} title="Descargar información" aria-label="Descargar producción"><ArrowDownToLine size={18}/></a>}
  </article>)}</div> : <div className="empty-productions"><div className="empty-illustration"><Clapperboard size={30}/><span>✦</span></div><div><h3>Aquí empieza tu catálogo.</h3><p>Tus videos y temporadas aparecerán aquí cuando crees tu primera producción.</p></div><button className="button secondary" onClick={() => navigate("create")}>Empezar<ArrowRight size={15}/></button></div>;

  return <div className="app-shell">
    <aside className={`sidebar ${menu ? "open" : ""}`}>
      <a className="wordmark" href="/" aria-label="Serie, inicio"><span className="brand-symbol"><Film size={21}/></span>serie<span className="brand-dot">.</span></a>
      <div className="workspace-label">ESTUDIO DE CONTENIDO</div>
      <nav aria-label="Navegación principal">{nav.map(([key, Icon, label]) => <button key={key} className={`nav-item ${tab === key ? "active" : ""}`} onClick={() => navigate(key)}><Icon size={18}/>{label}{key === "create" && <span className="nav-plus">+</span>}</button>)}</nav>
      <div className="nav-divider"/><div className="workspace-label">{data?.user.master ? "ADMINISTRACIÓN MASTER" : "CONFIGURACIÓN"}</div>
      <nav aria-label="Administración">{admin.filter(([key]) => data?.user.master || key === "connections").map(([key, Icon, label]) => <button key={key} className={`nav-item ${tab === key ? "active" : ""}`} onClick={() => navigate(key)}><Icon size={18}/>{label}</button>)}</nav>
      <div className="sidebar-bottom"><div className="internal-tag"><span/> Espacio privado · Fase interna</div><div className="user-block"><span className="avatar">{data?.user.name.slice(0, 2).toUpperCase() || "LC"}</span><div><strong>{data?.user.master ? "Administrador master" : "Mi cuenta"}</strong><small>{data?.user.email || "Tu estudio creativo"}</small></div><ShieldCheck size={17}/></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumbs"><button className="icon-button mobile-menu" onClick={() => setMenu(!menu)} aria-label="Abrir menú"><Menu size={20}/></button><span>Espacio de trabajo</span><span className="slash">/</span><strong>{account?.name || "Mi estudio"}</strong></div><div className="topbar-right"><span className="live-label"><span/>Primera versión</span>{data && <select aria-label="Seleccionar cuenta" value={accountId} onChange={e => setAccountId(e.target.value)}>{data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>}<button className="icon-button" onClick={() => void load()} aria-label="Actualizar estudio"><RefreshCw size={17}/></button></div></header>
    <main>
      <div className="page-heading"><div><div className="eyebrow">{tab === "home" ? "CREA. CONECTA. CUENTA ALGO." : "SERIE · ESTUDIO"}</div><h1>{titles[tab][0]}</h1><p>{titles[tab][1]}</p></div>
        {tab === "home" && <button className="button primary" onClick={() => navigate("create")}><Plus size={17}/>Nueva producción</button>}
        {tab === "profiles" && <button className="button primary" onClick={() => setModal("profile")} disabled={!account}><Plus size={17}/>Nuevo perfil</button>}
        {tab === "accounts" && <button className="button primary" onClick={() => { setPlan("basic"); setModal("account"); }}><Plus size={17}/>Nueva cuenta</button>}
      </div>
      {error && <div role="alert" className="alert error">{error}<button onClick={() => setError("")} aria-label="Cerrar error"><X size={16}/></button></div>}
      {notice && <div role="status" className="alert success"><Check size={17}/>{notice}</div>}
      {login ? <div className="empty-panel"><ShieldCheck size={32}/><h2>Tu estudio es privado.</h2><p>Inicia sesión para entrar a tus cuentas y producciones.</p><a className="button primary" href="/signin-with-chatgpt?return_to=%2F" target="_top">Entrar al estudio<ArrowRight size={16}/></a></div> : !data ? <div className="empty-panel"><Loader2 className="spin" size={26}/><p>{error ? "El estudio todavía no está disponible." : "Preparando tu espacio…"}</p></div> : <>
      {account?.status === "suspended" && <div className="alert error">Esta cuenta está suspendida. Sus datos permanecen disponibles para consulta.</div>}
      {tab === "home" && <>
        <section className="hero"><div className="hero-copy"><span className="pill light"><Sparkles size={13}/> De una idea a una temporada</span><h2>Más historias.<br/>Menos trabajo repetido.</h2><p>Crea videos y series completas con una identidad que se mantiene, capítulo a capítulo.</p><button className="button dark" onClick={() => navigate("create")}>Crear mi próxima historia<ArrowRight size={16}/></button><div className="hero-footnote">2D reutilizable <span>·</span> Imágenes con movimiento</div></div>
          <div className="hero-art" aria-hidden="true"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="mini-sticker"><Sparkles size={14}/> El siguiente capítulo empieza contigo</div><div className="art-card card-back"><div className="paper-sun"/><div className="paper-hill"/></div><div className="art-card card-front"><div className="frame-label">UNA IDEA. TODO UN UNIVERSO.</div><div className="character"><div className="character-hair"/><div className="character-face"><i/><i/><b/></div><div className="character-body"/><div className="character-arm"/></div><div className="art-plant"><i/><i/><i/></div><div className="frame-footer"><span>CAPÍTULO 01</span><span>✦</span></div></div><div className="art-play">▶</div><span className="art-spark spark-one">✦</span><span className="art-spark spark-two">✦</span></div>
        </section>
        <section className="stats-grid"><Stat icon={FolderOpen} label="Perfiles de marca" value={String(profiles.length)} detail={accountLimits?.profiles ? `de ${accountLimits.profiles} disponibles` : "Perfiles sin cupo fijo"}/><Stat icon={BookOpen} label="Producciones" value={String(jobs.length)} detail={`${jobs.filter(j => j.type === "series").length} temporadas configuradas`}/><Stat icon={Clock3} label="Minutos reservados / usados" value={String(Math.round((usage?.seconds || 0) / 60))} detail={accountLimits?.monthlyMinutes ? `de ${accountLimits.monthlyMinutes} este mes` : "Sin cupo fijo de minutos"}/><Stat icon={Wallet} label="Presupuesto reservado / usado" value={money(usage?.cents || 0)} detail={`Límite mensual: ${money(accountLimits?.monthlyBudgetCents || 0)}`}/></section>
        <div className="section-header"><div><h2>Tus producciones</h2><p>Todo lo que estás preparando, en un mismo lugar.</p></div><button className="text-button" onClick={() => navigate("productions")}>Ver todas<ArrowRight size={15}/></button></div>
        {renderJobs(jobs.slice(0, 4))}
        <section className="bottom-grid"><div className="info-card"><span className="small-icon"><Users size={20}/></span><h3>Una identidad para cada marca</h3><p>Separa tus páginas, negocios y clientes. Cada perfil conserva su contexto y sus recursos.</p><button className="text-button" onClick={() => navigate("profiles")}>Organizar mis perfiles<ArrowRight size={15}/></button></div><div className="info-card peach"><span className="small-icon"><BookOpen size={20}/></span><h3>Tu temporada, de principio a fin</h3><p>Una solicitud para 10 a 25 capítulos. Personajes, guiones y continuidad planificados juntos.</p><button className="text-button" onClick={() => navigate("create")}>Preparar una serie<ArrowRight size={15}/></button></div><div className="setup-card"><div className="eyebrow">PUESTA EN MARCHA</div><h3>Conectemos tu producción.</h3><p>La interfaz ya guarda tus solicitudes. La generación se habilita al conectar n8n y los proveedores.</p><button className="button secondary" onClick={() => navigate("connections")}>Ver conexiones<Link2 size={15}/></button></div></section>
      </>}
      {tab === "profiles" && <div className="profile-grid">{profiles.map(p => <article className="profile-card" key={p.id}><div className="profile-banner" style={{ background: p.brand_color }}><span>{p.name.slice(0, 2).toUpperCase()}</span><span className="pill light">{p.language}</span></div><div className="profile-content"><h3>{p.name}</h3><p>{p.niche}</p><div className="profile-detail"><Users size={15}/>{p.audience}</div><p className="muted brief">{p.brief || "Sin información adicional del negocio."}</p><button className="text-button" onClick={() => navigate("create")}>Crear contenido<ArrowRight size={15}/></button></div></article>)}<button className="add-profile" onClick={() => setModal("profile")} disabled={!account}><span><Plus size={23}/></span><strong>{profiles.length ? "Añadir otra marca" : "Crea tu primer perfil"}</strong><small>Un negocio, una página o un canal.</small></button></div>}
      {tab === "productions" && <><div className="section-header"><span className="pill">{jobs.length} producciones</span><button className="button primary" onClick={() => navigate("create")}><Plus size={16}/>Nueva producción</button></div>{renderJobs(jobs)}</>}
      {tab === "create" && (profiles.length === 0 ? <div className="empty-panel"><FolderOpen size={32}/><h2>Primero, dale una identidad.</h2><p>Crea un perfil con el negocio o propósito del canal para mantener la coherencia.</p><button className="button primary" onClick={() => setModal("profile")}><Plus size={16}/>Crear perfil de marca</button></div> : <div className="creation-layout"><form className="form-card" onSubmit={createProduction}>
        <div className="form-title"><span className="step-number">01</span><div><h2>Tu próxima producción</h2><p>Cuéntanos qué quieres crear.</p></div></div>
        <label>Perfil de marca<select name="profileId" required>{profiles.map(p => <option key={p.id} value={p.id}>{p.name} · {p.niche}</option>)}</select></label>
        <div className="choice-grid">{[["series", "Temporada completa", "10–25 capítulos"], ["video", "Video individual", "30–300 segundos"], ["vsl", "Micro VSL", "120–300 segundos"]].map(([key, name, detail]) => <button key={key} type="button" className={`choice ${type === key ? "selected" : ""}`} onClick={() => setType(key)}><Clapperboard size={20}/><strong>{name}</strong><small>{detail}</small>{type === key && <Check size={13}/>}</button>)}</div>
        <label>Título de trabajo<input name="title" placeholder="Ej. Las aventuras de un negocio que empieza" required minLength={3} maxLength={140}/></label>
        <label>Tema, objetivo e información importante<textarea name="topic" rows={5} placeholder="Qué quieres contar, para quién y qué debería aprender o sentir la audiencia. En ventas, incluye oferta, pruebas y CTA." required minLength={10} maxLength={12000}/></label>
        <div className="form-row">{type === "series" && <label>Capítulos<select name="episodes">{Array.from({ length: Math.max(1, (accountLimits?.maxEpisodes || 10) - 9) }, (_, i) => <option key={i} value={i + 10}>{i + 10} capítulos</option>)}</select></label>}<label>Duración por {type === "series" ? "capítulo" : "video"}<select key={type} name="duration" defaultValue={type === "vsl" ? 180 : 90}>{[30, 45, 60, 90, 120, 180, 240, 300].filter(n => n <= (accountLimits?.maxDuration || 300) && (type !== "vsl" || n >= 120)).map(n => <option key={n} value={n}>{n} segundos</option>)}</select></label></div>
        <div className="form-row"><label>Estilo visual<select name="style"><option value="2d">2D reutilizable</option><option value="motion">Imágenes con movimiento</option></select></label><label>Presupuesto máximo · USD<input name="budget" type="number" min="1" step="0.01" defaultValue="10" max={(accountLimits?.monthlyBudgetCents || 10000) / 100} required/></label></div>
        <div className="form-note"><ShieldCheck size={17}/><span>El presupuesto es un tope, no un cobro. Se comprueba de nuevo antes de iniciar.</span></div>
        <button className="button primary wide" disabled={busy || account?.status !== "active"}>{busy ? <Loader2 className="spin" size={16}/> : <Sparkles size={17}/>}Crear producción</button>
      </form><aside className="creation-side"><span className="pill">TU FLUJO CREATIVO</span><h2>Una solicitud.<br/>Toda la historia.</h2>{["Ficha de personajes y universo", "Plan de temporada completo", "Guiones y revisión de continuidad", "Voz, imágenes y animación", "Videos, portadas y copies"].map((step, i) => <div className="flow-step" key={step}><span>{String(i + 1).padStart(2, "0")}</span>{step}</div>)}<div className="connection-note"><span className={`status-dot ${data.connections.n8n ? "connected" : ""}`}/>{data.connections.n8n ? "n8n configurado" : "n8n pendiente de conexión"}<p>{data.connections.n8n ? "La solicitud se enviará al flujo conectado." : "Puedes guardar solicitudes. Todavía no se generarán videos ni se gastarán créditos."}</p></div></aside></div>)}
      {tab === "accounts" && <><div className="table-wrap"><table><thead><tr><th>Cuenta</th><th>Tipo</th><th>Plan</th><th>Presupuesto mensual</th><th>Estado</th><th/></tr></thead><tbody>{data.accounts.map(a => <tr key={a.id}><td><strong>{a.name}</strong><small>{data.profiles.filter(p => p.account_id === a.id).length} perfiles</small></td><td>{a.kind === "internal" ? "Uso interno" : "Cliente"}</td><td><span className={`plan-tag ${a.plan}`}>{planName(a.plan)}</span></td><td>{money(JSON.parse(a.limits).monthlyBudgetCents)}</td><td><span className={`status-badge ${a.status === "active" ? "good" : ""}`}>{a.status === "active" ? "Activa" : "Suspendida"}</span></td><td><button className="text-button" onClick={() => openLimits(a)}>Administrar<Settings2 size={15}/></button><button className="text-button" onClick={() => { setEditing(a); setModal("member"); }}>Asignar usuario<Users size={15}/></button></td></tr>)}</tbody></table></div>
        <div className="section-header"><div><h2>Usuarios y permisos</h2><p>El portal externo permanece cerrado durante la fase interna.</p></div></div><div className="table-wrap"><table><thead><tr><th>Usuario</th><th>Cuenta</th><th>Rol</th><th>Identidad</th></tr></thead><tbody>{data.members.map(m => <tr key={m.id}><td>{m.email}</td><td>{data.accounts.find(a => a.id === m.account_id)?.name}</td><td>{{ owner: "Administrador de cuenta", editor: "Editor", viewer: "Solo lectura" }[m.role]}</td><td>{m.user_id ? "Vinculada" : "Pendiente de acceso"}</td></tr>)}</tbody></table></div>
      </>}
      {tab === "plans" && <><div className="plans-grid">{Object.entries(data.plans).map(([key, l]) => <article className={`plan-card ${key === "pro" ? "featured" : ""}`} key={key}>{key === "pro" && <span className="plan-recommended">PARA VARIAS MARCAS</span>}<span className={`plan-tag ${key}`}>{planName(key)}</span><h2>{key === "basic" ? "Empieza a contar." : key === "pro" ? "Amplía tu estudio." : "Crea a tu ritmo."}</h2><p>{key === "basic" ? "Un punto de partida para pocas marcas." : key === "pro" ? "Más espacio para clientes y temporadas." : "Sin cupo fijo de perfiles o minutos."}</p><ul>{[`${l.profiles || "Sin límite fijo de"} perfiles de marca`, `${l.monthlyMinutes || "Sin límite fijo de"} minutos al mes`, `Hasta ${l.maxEpisodes} capítulos por temporada`, `Videos de hasta ${l.maxDuration} segundos`, `${l.concurrentJobs} trabajos simultáneos`, `${money(l.monthlyBudgetCents)} de presupuesto mensual inicial`].map(item => <li key={item}><Check size={15}/>{item}</li>)}</ul><span className="muted">Valores iniciales · editables por cuenta</span></article>)}</div><div className="form-note"><ShieldCheck size={18}/><span>Unlimited mantiene un presupuesto y una concurrencia configurables para controlar el gasto. Los planes aún no tienen precio de venta.</span></div></>}
      {tab === "connections" && <><div className="connections-grid">{[["n8n", "n8n", "Coordina la planificación y las etapas de producción."], ["text", "Guiones y continuidad", "API para crear personajes, temporadas y guiones."], ["renderer", "Motor visual", "CODE ART y composición de imágenes con movimiento."], ["facebook", "Facebook", "Publicación programada en las páginas conectadas."], ["instagram", "Instagram", "Publicación programada en los perfiles conectados."]].map(([key, name, description]) => <article className="connection-card" key={key}><div className="connection-title"><span className="small-icon"><Link2 size={20}/></span><span className={`status-badge ${data.connections[key] ? "good" : ""}`}>{data.connections[key] ? "Configurado" : "Pendiente"}</span></div><h3>{name}</h3><p>{description}</p><small>{["renderer", "facebook", "instagram"].includes(key) ? "Integración pendiente de implementación y prueba." : "Configuración segura en el servidor."}</small></article>)}</div><div className="download-card"><div><h3>Flujo de planificación para n8n</h3><p>Importa el archivo y asigna las credenciales antes de activarlo. Genera la ficha, el arco y los guiones; el render se conecta en la siguiente entrega.</p></div><a className="button secondary" href="/workflows/01-planificar-temporada.json" download><ArrowDownToLine size={16}/>Descargar flujo</a></div><div className="form-note"><ShieldCheck size={18}/><span>Las claves se guardan fuera del navegador. Esta versión privada utiliza inicio de sesión con ChatGPT. El acceso comercial se revisará antes de abrir el portal a clientes.</span></div></>}
      <footer className="page-footer"><span>serie. <span>Hecho para historias con continuidad.</span></span><span>2D + movimiento · Facebook + Instagram</span></footer>
      </>}
    </main></div>
    {modal && <Modal title={modal === "profile" ? "Nuevo perfil de marca" : modal === "account" ? "Crear una cuenta" : modal === "limits" ? `Plan y límites · ${editing?.name}` : `Asignar usuario · ${editing?.name}`} close={() => setModal(null)}><form onSubmit={saveForm}>
      {modal === "profile" && <><p className="modal-intro">Una identidad independiente para cada negocio, página o cliente.</p><label>Nombre<input name="name" required minLength={2} maxLength={100} placeholder="Ej. Café del Barrio"/></label><label>Negocio o propósito del canal<input name="niche" required minLength={2} maxLength={200} placeholder="Ej. Cafetería local y cultura del café"/></label><label>Audiencia<input name="audience" required minLength={2} maxLength={300} placeholder="Ej. Jóvenes adultos de Guatemala"/></label><div className="form-row"><label>Color de marca<input name="brandColor" type="color" defaultValue="#377c6b"/></label><label>Idioma<select name="language"><option value="es-LATAM">Español latinoamericano</option><option value="es-ES">Español de España</option><option value="en">Inglés</option></select></label></div><label>Información del negocio<textarea name="brief" rows={4} maxLength={10000} placeholder="Oferta, tono, diferenciadores y datos que el contenido debe respetar."/></label></>}
      {modal === "account" && <><label>Nombre de la cuenta<input name="name" required minLength={2} maxLength={100}/></label><div className="form-row"><label>Tipo<select name="kind"><option value="internal">Cuenta interna</option><option value="client">Cuenta de cliente</option></select></label><label>Plan<select name="plan" value={plan} onChange={e => setPlan(e.target.value)}><option value="basic">Básico</option><option value="pro">Pro</option><option value="unlimited">Unlimited</option></select></label></div><label>Email del responsable · opcional<input name="email" type="email" maxLength={200}/></label><p className="muted">Asigna permisos internos. No envía invitaciones ni abre el acceso público.</p></>}
      {modal === "member" && <><label>Correo del usuario<input name="email" type="email" required maxLength={200}/></label><label>Permiso<select name="role"><option value="owner">Administrador de cuenta</option><option value="editor">Editor</option><option value="viewer">Solo lectura</option></select></label><p className="muted">Cada usuario de cuenta solo podrá acceder a sus perfiles y producciones cuando se habilite el portal externo.</p></>}
      {modal === "limits" && limits && <><div className="form-row"><label>Plan<select value={plan} onChange={e => { setPlan(e.target.value); setLimits(data!.plans[e.target.value]); }}><option value="basic">Básico</option><option value="pro">Pro</option><option value="unlimited">Unlimited</option></select></label><label>Estado<select name="status" defaultValue={editing?.status}><option value="active">Activa</option><option value="suspended">Suspendida</option></select></label></div><p className="muted">Cambiar el plan carga sus valores iniciales. Puedes personalizarlos abajo.</p><div className="form-row">{([["profiles", "Perfiles", 1, 10000], ["monthlyMinutes", "Minutos al mes", 1, 1000000], ["maxEpisodes", "Capítulos por temporada", 10, 25], ["maxDuration", "Duración máxima · segundos", 30, 300], ["concurrentJobs", "Trabajos simultáneos", 1, 20]] as const).map(([key, name, min, max]) => <label key={key}>{name}<input type="number" min={min} max={max} value={limits[key] ?? ""} placeholder="Sin cupo fijo" required={key !== "profiles" && key !== "monthlyMinutes"} onChange={e => setLimits({ ...limits, [key]: e.target.value === "" ? null : Number(e.target.value) })}/></label>)}<label>Presupuesto mensual · USD<input type="number" required min="1" max="100000" step="0.01" value={limits.monthlyBudgetCents / 100} onChange={e => setLimits({ ...limits, monthlyBudgetCents: Math.round(Number(e.target.value) * 100) })}/></label></div></>}
      {error && <p role="alert" className="field-error">{error}</p>}<div className="modal-actions"><button className="button secondary" type="button" onClick={() => setModal(null)}>Cancelar</button><button className="button primary" disabled={busy}>{busy && <Loader2 className="spin" size={15}/>}Guardar</button></div>
    </form></Modal>}
  </div>;
}
function Stat({ icon: Icon, label, value, detail }: { icon: typeof Film; label: string; value: string; detail: string }) { return <article className="stat-card"><div><span>{label}</span><Icon size={17}/></div><strong>{value}</strong><small>{detail}</small></article>; }
function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null); useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} onCancel={close} className="modal"><div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={close} aria-label="Cerrar ventana"><X size={20}/></button></div>{children}</dialog>;
}
