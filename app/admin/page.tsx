'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, UtensilsCrossed, LayoutDashboard, ShoppingBag, BookOpen, Settings, Image, Users, Shield, Plus, Pencil, Trash2, Search, LogOut, Check, Upload, BarChart3, Activity, Smartphone, Monitor, Tablet, Eye, MousePointerClick, Clock, ArrowRight, Heart, Calendar, MessageSquare, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { sample, api, money, type Content, type RecordData, type Kitchen } from '@/lib/kitchen';
const modules = [['OPERATIONS', 'dashboard', 'analytics', 'orders', 'customers'], ['MENU', 'sections', 'categories', 'items', 'variants', 'addon-groups', 'addons'], ['WEBSITE', 'hero', 'banners', 'about', 'contact', 'footer', 'seo', 'testimonials'], ['MANAGE', 'coupons', 'media', 'settings', 'audit']];
const title = (v: string) => v.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join(' ');
export default function Admin() {
    const [demo, setDemo] = useState(false), [signed, setSigned] = useState(false), [module, setModule] = useState('dashboard'), [data, setData] = useState<Content>(sample), [rows, setRows] = useState<RecordData[]>([]), [orders, setOrders] = useState<any[]>([]), [search, setSearch] = useState(''), [page, setPage] = useState(1), [total, setTotal] = useState(0), [error, setError] = useState(''), [toast, setToast] = useState(''), [loading, setLoading] = useState(false), [editing, setEditing] = useState<RecordData | null>(null), [deleting, setDeleting] = useState<RecordData | null>(null), [settings, setSettings] = useState<Kitchen>(sample.kitchen);
    const [analyticsData, setAnalyticsData] = useState<{ metrics: any; topCards: any[]; sessions: any[]; interests?: any[] } | null>(null);
    const [selectedSession, setSelectedSession] = useState<any | null>(null);
    useEffect(() => { api('auth/me').then(async () => { setSigned(true); setData(await api('public/madhurawada')); }).catch(() => { }); }, []);
    useEffect(() => { if (!toast)
        return; const id = setTimeout(() => setToast(''), 3500); return () => clearTimeout(id); }, [toast]);
    async function refresh() { if (!signed && !demo)
        return; setLoading(true); setError(''); try {
        if (demo) {
            const values = (data[module] as RecordData[] || []);
            setRows(Array.isArray(values) ? values.filter(r => r.name.toLowerCase().includes(search.toLowerCase())).slice((page - 1) * 20, page * 20) : []);
            setTotal(Array.isArray(values) ? values.length : 0);
        }
        else if (module === 'settings') {
            setSettings(await api('admin/settings'));
        }
        else if (module === 'analytics') {
            const res = await api('admin/analytics');
            setAnalyticsData(res);
        }
        else if (module === 'orders' || module === 'dashboard') {
            setOrders(await api('admin/orders'));
        }
        else if (['customers', 'audit'].includes(module)) {
            const records = await api('admin/' + module);
            setRows(records);
        }
        else {
            const r = await api(`admin/content/${module}?page=${page}&search=${encodeURIComponent(search)}`);
            setRows(r.data);
            setTotal(r.total);
        }
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setLoading(false);
    } }
    useEffect(() => { void refresh(); }, [module, demo, signed, page, search, data]);
    async function login(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); setError(''); const f = new FormData(e.currentTarget); try {
        await api('auth/login', 'POST', { email: f.get('email'), password: f.get('password') });
        setSigned(true);
        const content = await api('public/madhurawada');
        setData(content);
    }
    catch (e) {
        setError((e as Error).message);
    } }
    async function save(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); if (!editing)
        return; setError(''); const { id, ...payload } = editing; try {
        if (demo) {
            setData(d => ({ ...d, [module]: id ? (d[module] as RecordData[]).map(r => r.id === id ? editing : r) : [...(d[module] as RecordData[] || []), { ...editing, id: crypto.randomUUID() }] }));
        }
        else {
            await api('admin/content/' + module + (id ? '/' + id : ''), id ? 'PUT' : 'POST', payload);
            setData(await api('public/madhurawada'));
            await refresh();
        }
        setEditing(null);
        setToast(demo ? 'Preview updated for this session' : 'Saved to database');
    }
    catch (e) {
        setError((e as Error).message);
    } }
    async function remove() { if (!deleting)
        return; try {
        if (demo)
            setData(d => ({ ...d, [module]: (d[module] as RecordData[]).filter(r => r.id !== deleting.id) }));
        else {
            await api(`admin/content/${module}/${deleting.id}`, 'DELETE');
            await refresh();
        }
        setDeleting(null);
        setToast('Record deleted');
    }
    catch (e) {
        setError((e as Error).message);
        setDeleting(null);
    } }
    const field = (key: string, value: unknown) => setEditing(e => e ? ({ ...e, [key]: value }) : null);
    const choose = (key: string, label: string, options: RecordData[]) => <label>{label}<Select value={String(editing?.[key] || '')} onValueChange={v => field(key, v)}><SelectTrigger><SelectValue placeholder={'Choose ' + label.toLowerCase()}/></SelectTrigger><SelectContent>{options.map(o => <SelectItem value={o.id} key={o.id}>{o.name}</SelectItem>)}</SelectContent></Select></label>;
    if (!signed && !demo)
        return <div className="login-page"><a href="/" className="brand"><span className="brand-icon"><UtensilsCrossed /></span>Madhurawada Home Kitchen</a><div className="login-card"><div className="eyebrow">KITCHEN WORKSPACE</div><h1>A good day starts here.</h1><p>Sign in to manage your menu, website and orders.</p><form className="form-stack" onSubmit={login}><label>Email<input name="email" type="email" defaultValue="admin@madhurawada.com" autoComplete="username" required/></label><label>Password<input name="password" type="password" defaultValue="adminpassword123" autoComplete="current-password" required/></label>{error && <div role="alert" className="error">{error}</div>}<button className="primary">Sign in <ArrowUpRight size={18}/></button></form><div className="login-divider">Preview the workspace</div><button className="outline full" onClick={() => { setDemo(true); setError(''); }}>Explore sample admin</button><small>The sample workspace uses session-only data. It does not change your database or website.</small></div><a href="/">← Back to the menu</a></div>;
    const special = ['dashboard', 'analytics', 'orders', 'customers', 'settings', 'audit'];
    return <div className="admin-shell"><aside className="admin-sidebar"><a className="admin-logo" href="/"><span className="brand-icon"><UtensilsCrossed size={21}/></span><span>Home Kitchen<small>MANAGEMENT STUDIO</small></span></a><div className="kitchen-label">MADHURAWADA <span>⌄</span></div>{modules.map(([label, ...entries]) => <div className="nav-group" key={label}><small>{label}</small>{entries.map(m => <button key={m} className={module === m ? 'active' : ''} onClick={() => { setModule(m); setPage(1); setSearch(''); setError(''); }}>{m === 'dashboard' ? <LayoutDashboard /> : m === 'analytics' ? <BarChart3 /> : m === 'orders' ? <ShoppingBag /> : m === 'settings' ? <Settings /> : m === 'media' ? <Image /> : m === 'customers' ? <Users /> : m === 'audit' ? <Shield /> : <BookOpen />}{title(m)}</button>)}</div>)}<button className="logout" onClick={async () => { if (!demo)
        await api('auth/logout', 'POST'); setSigned(false); setDemo(false); }}><LogOut size={16}/> Sign out</button></aside><div className="admin-main"><header className="admin-topbar"><span>Kitchen workspace <span className="slash">/</span> {title(module)}</span><a href="/">View website <ArrowUpRight size={15}/></a></header>{demo && <div className="demo-bar">SAMPLE WORKSPACE · Changes last for this session only. PostgreSQL is not connected.</div>}<div className="admin-content"><div className="admin-heading"><div><div className="eyebrow">{module === 'dashboard' ? 'YOUR KITCHEN, AT A GLANCE' : module === 'analytics' ? 'PRE-RELEASE VISITOR STATS & SURVEY' : 'KITCHEN MANAGEMENT'}</div><h1>{module === 'dashboard' ? 'Welcome to your kitchen.' : module === 'analytics' ? 'Visitor Stats & Telemetry' : title(module)}</h1><p>{module === 'dashboard' ? 'A clear view of your orders and daily operations.' : module === 'analytics' ? 'Real-time telemetry tracking who visited, latest seen time, time spent, card clicks, and user journeys.' : `Manage your ${title(module).toLowerCase()} from one place.`}</p></div>{!special.includes(module) && <button className="primary" onClick={() => setEditing({ id: '', name: '', description: '', active: true, sortOrder: 0, ...(module === 'items' ? { price: 0, veg: true, prepTime: 25 } : {}) })}><Plus size={17}/> Add {module === 'items' ? 'item' : 'record'}</button>}</div>{error && <div className="error" role="alert">{error}</div>}{toast && <div className="toast" role="status"><Check size={17}/>{toast}</div>}
        {module === 'dashboard' ? <><div className="stats">{[['Orders loaded', orders.length], ['Awaiting confirmation', orders.filter(o => o.status === 'PENDING').length], ['Preparing', orders.filter(o => o.status === 'PREPARING').length], ['Delivered order value', money(orders.filter(o => o.status === 'DELIVERED').reduce((n, o) => n + o.total / 100, 0))]].map(([label, v]) => <div className="stat" key={label}><small>{label}</small><strong>{v}</strong><span>{demo ? 'No sample transactions' : 'Latest 50 orders · not a full financial report'}</span></div>)}</div><div className="admin-columns"><section className="panel"><div className="panel-heading"><h2>Recent orders</h2><button onClick={() => setModule('orders')}>View all <ArrowUpRight size={16}/></button></div>{orders.length ? orders.slice(0, 5).map(o => <div className="cart-line" key={o.id}><span>{o.customer?.name}</span><b>{money(o.total / 100)}</b><span>{o.status}</span></div>) : <div className="empty"><ShoppingBag size={32}/><h3>Your first order starts a story.</h3><p>Confirmed customer orders will appear here.</p></div>}</section><section className="panel checklist"><h2>Get your kitchen ready</h2>{[['Branding & contact', 'settings'], ['Build your menu', 'items'], ['Tell your story', 'about'], ['Set up your homepage', 'hero']].map(([label, m], i) => <button key={m} onClick={() => setModule(m)}><span>{String(i + 1).padStart(2, '0')}</span>{label}<ArrowUpRight size={17}/></button>)}<div className="notice">Before launch: verify menu prices, allergens, delivery arrangements and premises permissions.</div></section></div></> :
            module === 'analytics' ? <div className="space-y-6">
              {/* Telemetry Summary Metric KPI Cards */}
              <div className="stats">
                {[
                  ['Total Visitor Sessions', analyticsData?.metrics?.totalSessions ?? 0, 'Unique visitors tracked'],
                  ['Active (Last 30m)', analyticsData?.metrics?.activeRecent ?? 0, 'Recently active visitors'],
                  ['Card Clicks & Zooms', analyticsData?.metrics?.totalCardClicks ?? 0, 'Total dish opens & clicks'],
                  ['VIP Waitlist Interests', analyticsData?.metrics?.totalInterests ?? (analyticsData?.interests?.length ?? 0), 'Waiting for service launch'],
                  ['Cart Additions', analyticsData?.metrics?.totalCartActions ?? 0, 'Items added to bag'],
                  ['WhatsApp Clicks', analyticsData?.metrics?.totalWhatsAppClicks ?? 0, 'Direct chat inquiries'],
                  ['Avg. Time Spent', `${analyticsData?.metrics?.avgDurationSeconds ?? 0}s`, 'Average session duration'],
                ].map(([label, val, desc]) => (
                  <div className="stat" key={String(label)}>
                    <small>{label}</small>
                    <strong className="text-amber-800">{val}</strong>
                    <span>{desc}</span>
                  </div>
                ))}
              </div>

              {/* Top Clicked Dishes & Visual Highlights */}
              <div className="admin-columns">
                <section className="panel">
                  <div className="panel-heading">
                    <h2 className="flex items-center gap-2">
                      <MousePointerClick size={18} className="text-amber-600" />
                      Top Clicked & Explored Dishes
                    </h2>
                  </div>
                  {analyticsData?.topCards && analyticsData.topCards.length > 0 ? (
                    <div className="space-y-3 pt-2">
                      {analyticsData.topCards.map((item: any, idx: number) => (
                        <div key={item.name} className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-sm text-stone-900">{item.name}</span>
                          </div>
                          <span className="text-xs font-mono font-bold bg-amber-700 text-white px-2 py-0.5 rounded-full">
                            {item.count} clicks
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty">
                      <Eye size={28} />
                      <p>No dish card clicks recorded yet.</p>
                    </div>
                  )}
                </section>

                <section className="panel">
                  <div className="panel-heading">
                    <h2 className="flex items-center gap-2">
                      <Activity size={18} className="text-emerald-600" />
                      Real-Time Survey & Telemetry Info
                    </h2>
                  </div>
                  <div className="space-y-3 text-xs text-stone-600 leading-relaxed pt-2">
                    <p className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-stone-800">
                      <strong>Pre-release Telemetry Active:</strong> Tracks visitor sessions, latest active timestamp, duration spent, category interest, and every food card click/zoom.
                    </p>
                    <p className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl text-stone-800">
                      <strong>Waiting for Service Survey:</strong> Early residents expressing interest in our launch are captured with phone, preferred meal, and locality for launch day notifications.
                    </p>
                    <button
                      onClick={() => refresh()}
                      className="primary w-full flex items-center justify-center gap-2 py-2"
                    >
                      <Activity size={15} /> Refresh Live Telemetry Data
                    </button>
                  </div>
                </section>
              </div>

              {/* Customer Service Interest & Waitlist Survey Table */}
              <section className="panel">
                <div className="panel-heading">
                  <h2 className="flex items-center gap-2">
                    <Heart size={18} className="text-rose-600 fill-rose-600" />
                    Interested Customers & Service Waitlist Survey
                  </h2>
                  <span className="text-xs font-bold text-rose-800 bg-rose-100 border border-rose-200 px-2.5 py-0.5 rounded-full">
                    {analyticsData?.interests?.length ?? 0} Interested Visitors Waiting
                  </span>
                </div>
                <div className="admin-table-container">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer Name</TableHead>
                        <TableHead>WhatsApp Phone</TableHead>
                        <TableHead>Preferred Meal</TableHead>
                        <TableHead>Madhurawada Area</TableHead>
                        <TableHead>Special Requests</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyticsData?.interests && analyticsData.interests.length > 0 ? (
                        analyticsData.interests.map((it: any) => (
                          <TableRow key={it.id || it.phone}>
                            <TableCell>
                              <b className="text-stone-900 block">{it.name}</b>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                +91 {it.phone}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-medium text-stone-700">{it.mealPreference}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-stone-600">{it.preferredArea}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-stone-500 italic">{it.note || 'None'}</span>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-stone-500">
                                {new Date(it.createdAt || it.submittedAt || Date.now()).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <a
                                href={`https://wa.me/91${it.phone}?text=${encodeURIComponent(
                                  `Hello ${it.name}! Thank you for registering your interest in Madhurawada Home Kitchen. We are launching service soon!`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1 rounded-lg"
                              >
                                <MessageSquare size={13} /> WhatsApp
                              </a>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-6 text-stone-500 text-xs">
                            No service interest submissions yet. Visitors will appear here when they click "I'm Interested · Waiting for Service".
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </section>

              {/* Comprehensive Visitor Sessions Table */}
              <section className="panel">
                <div className="panel-heading">
                  <h2>Visitor Sessions by Latest Active Time</h2>
                  <span className="text-xs text-stone-500 font-medium">
                    {analyticsData?.sessions?.length ?? 0} Recorded Sessions
                  </span>
                </div>
                <div className="admin-table-container">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Session ID</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>Latest Seen Time</TableHead>
                        <TableHead>Time Spent</TableHead>
                        <TableHead>Dishes Opened / Clicked</TableHead>
                        <TableHead>Latest Action</TableHead>
                        <TableHead>Action Log</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyticsData?.sessions && analyticsData.sessions.length > 0 ? (
                        analyticsData.sessions.map((s: any) => (
                          <TableRow key={s.sessionId}>
                            <TableCell>
                              <span className="font-mono text-xs font-bold text-stone-800 bg-stone-100 px-2 py-1 rounded">
                                {s.sessionId}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700">
                                {s.device === 'Mobile' ? (
                                  <Smartphone size={15} className="text-orange-600" />
                                ) : s.device === 'Tablet' ? (
                                  <Tablet size={15} className="text-blue-600" />
                                ) : (
                                  <Monitor size={15} className="text-stone-600" />
                                )}
                                {s.device || 'Desktop'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs">
                                <b className="text-stone-900 block">
                                  {new Date(s.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </b>
                                <small className="text-stone-500">
                                  {new Date(s.lastSeen).toLocaleDateString()}
                                </small>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-xs font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                {s.durationSeconds ? `${s.durationSeconds}s` : '< 5s'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs text-xs truncate">
                                {s.cardClicks && s.cardClicks.length > 0 ? (
                                  <span className="text-stone-800 font-medium">
                                    {s.cardClicks.slice(0, 2).join(', ')}
                                    {s.cardClicks.length > 2 ? ` +${s.cardClicks.length - 2} more` : ''}
                                  </span>
                                ) : (
                                  <span className="text-stone-400 italic">None yet</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-stone-600 font-mono max-w-[140px] truncate block">
                                {s.latestAction || 'Browsing'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <button
                                className="outline !py-1 !px-2.5 text-xs"
                                onClick={() => setSelectedSession(s)}
                              >
                                View Events ({s.events?.length || 0})
                              </button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-6 text-stone-500 text-xs">
                            No visitor sessions captured yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </section>

              {/* Drill-down Session Event Trail Modal */}
              <Dialog open={!!selectedSession} onOpenChange={(v) => !v && setSelectedSession(null)}>
                <DialogContent className="w-[95vw] max-w-lg p-5 rounded-2xl max-h-[85vh] overflow-y-auto">
                  <DialogTitle className="flex items-center justify-between text-base font-bold">
                    <span>Visitor Journey Audit</span>
                    <span className="font-mono text-xs font-semibold bg-stone-100 px-2 py-0.5 rounded">
                      {selectedSession?.sessionId}
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Device: <b>{selectedSession?.device}</b> · Latest Seen:{' '}
                    <b>
                      {selectedSession?.lastSeen &&
                        new Date(selectedSession.lastSeen).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                    </b>{' '}
                    · Total Time: <b>{selectedSession?.durationSeconds}s</b>
                  </DialogDescription>

                  <div className="my-4 space-y-3">
                    <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Event Chronology ({selectedSession?.events?.length || 0} actions)
                    </h3>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {selectedSession?.events && selectedSession.events.length > 0 ? (
                        selectedSession.events.map((ev: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg border border-stone-200 bg-stone-50 text-xs space-y-1"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded text-[10px]">
                                {ev.type}
                              </span>
                              <span className="text-[10px] text-stone-500 font-mono">
                                {new Date(ev.time).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="font-medium text-stone-800">{ev.target || 'Page action'}</div>
                            {ev.details && (
                              <div className="text-[11px] text-stone-500 font-mono bg-white p-1.5 rounded border border-stone-200">
                                {JSON.stringify(ev.details)}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-stone-400 italic">No detailed events logged for this session.</p>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div> :
            module === 'settings' ? <form className="panel form-stack settings-form" onSubmit={async (e) => { e.preventDefault(); try {
                if (demo)
                    setData(d => ({ ...d, kitchen: settings }));
                else
                    await api('admin/settings', 'PUT', settings);
                setToast(demo ? 'Sample settings updated' : 'Settings saved');
            }
            catch (e) {
                setError((e as Error).message);
            } }}>{Object.entries(settings).map(([key, v]) => typeof v === 'boolean' ? <label className="switch-label" key={key}><Switch checked={v} onCheckedChange={c => setSettings(s => ({ ...s, [key]: c }))}/>{title(key)}</label> : <label key={key}>{title(key)}<input type={typeof v === 'number' ? 'number' : key === 'color' ? 'color' : 'text'} value={v} onChange={e => setSettings(s => ({ ...s, [key]: typeof v === 'number' ? Number(e.target.value) : e.target.value }))}/></label>)}<button className="primary">Save kitchen settings</button></form> :
                module === 'orders' ? (
                  <div className="panel">
                    <div className="panel-heading flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-base font-bold text-stone-900">Live Customer Orders</h2>
                        <p className="text-xs text-stone-500">Track Order IDs, scheduled timings, and kitchen preparation stages.</p>
                      </div>
                      <span className="text-xs font-semibold bg-stone-100 text-stone-700 px-3 py-1 rounded-full border border-stone-200">
                        {orders.length} Total Orders
                      </span>
                    </div>

                    <div className="admin-table-container">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[130px]">Order ID & Date</TableHead>
                            <TableHead className="min-w-[200px]">Delivery Timing</TableHead>
                            <TableHead className="min-w-[200px]">Customer</TableHead>
                            <TableHead className="min-w-[180px]">Items</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Next Step</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders.map((o) => {
                            const isScheduled = o.note?.includes('[SCHEDULED:');
                            let scheduleTiming = '';
                            let customerNote = o.note || '';
                            if (isScheduled) {
                              const match = o.note.match(/\[SCHEDULED:\s*([^\]]+)\]/);
                              if (match) {
                                scheduleTiming = match[1];
                                customerNote = o.note.replace(/\[SCHEDULED:\s*[^\]]+\]\s*-?\s*/, '').trim();
                              }
                            }

                            return (
                              <TableRow key={o.id} className={isScheduled ? 'bg-purple-50/20' : ''}>
                                <TableCell className="align-top pr-3">
                                  <div className="space-y-1">
                                    <span className="font-mono text-xs font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 block w-fit">
                                      #{o.id.slice(0, 8).toUpperCase()}
                                    </span>
                                    <div className="text-[11px] text-stone-500">
                                      <div>{new Date(o.createdAt).toLocaleDateString()}</div>
                                      <div className="font-mono text-[10px] text-stone-400">
                                        {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>

                                <TableCell className="align-top pr-4">
                                  {isScheduled ? (
                                    <div className="space-y-1 max-w-[210px]">
                                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-900 border border-purple-200">
                                        <Calendar size={11} className="text-purple-700" />
                                        <span>SCHEDULED</span>
                                      </div>
                                      <div className="text-xs font-bold text-purple-950 leading-tight">
                                        📅 {scheduleTiming}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      <Zap size={13} className="text-emerald-600" />
                                      <span>ASAP Delivery</span>
                                    </div>
                                  )}
                                </TableCell>

                                <TableCell className="align-top pr-4">
                                  <b className="text-stone-900 block text-xs">{o.customer?.name || 'Customer'}</b>
                                  <small className="font-mono text-stone-600 block">{o.customer?.phone}</small>
                                  {o.address && (
                                    <small className="text-stone-500 block max-w-[170px] truncate" title={o.address}>
                                      📍 {o.address}
                                    </small>
                                  )}
                                  {customerNote && (
                                    <small className="text-amber-800 font-semibold block mt-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                      Note: {customerNote}
                                    </small>
                                  )}
                                </TableCell>

                                <TableCell className="align-top pr-3">
                                  <div className="text-xs text-stone-800 max-w-[200px]">
                                    {o.items?.map((i: any) => `${i.quantity} × ${i.name}`).join(', ')}
                                  </div>
                                </TableCell>

                                <TableCell className="align-top">
                                  <span className="font-bold text-xs text-stone-900">{money(o.total / 100)}</span>
                                </TableCell>

                                <TableCell className="align-top">
                                  <span className="status">{o.status}</span>
                                </TableCell>

                                <TableCell className="align-top">
                                  <div className="flex flex-wrap gap-1">
                                    {({
                                      PENDING: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
                                      CONFIRMED: ['PREPARING', 'CANCELLED'],
                                      PREPARING: ['READY', 'CANCELLED'],
                                      READY: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
                                      OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
                                    } as Record<string, string[]>)[o.status]?.map((s: string) => (
                                      <button
                                        className="outline !py-1 !px-2 text-[11px]"
                                        key={s}
                                        onClick={async () => {
                                          try {
                                            await api(`admin/orders/${o.id}/status`, 'PATCH', { status: s });
                                            await refresh();
                                          } catch (e) {
                                            setError((e as Error).message);
                                          }
                                        }}
                                      >
                                        {s.replaceAll('_', ' ')}
                                      </button>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {!orders.length && <div className="empty">No orders yet.</div>}
                  </div>
                ) :
                    <section className="panel"><div className="table-toolbar"><label className="search"><Search size={17}/><input placeholder={'Search ' + module} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/></label><span>{total} records</span></div>{loading ? <div className="empty">Loading…</div> : <div className="admin-table-container"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>{module === 'items' ? 'Price' : 'Details'}</TableHead><TableHead>Status</TableHead><TableHead>Order</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{rows.map(r => <TableRow key={r.id}><TableCell><b>{r.name || String(r.action || r.id)}</b></TableCell><TableCell>{r.price !== undefined ? money(r.price) : String(r.description || r.phone || r.createdAt || '').slice(0, 90)}</TableCell><TableCell><span className={'status ' + (r.active === false ? 'inactive' : '')}>{r.active === false ? 'Hidden' : 'Active'}</span></TableCell><TableCell>{r.sortOrder ?? '—'}</TableCell><TableCell>{!['customers', 'audit'].includes(module) && <div className="row-actions"><button aria-label={'Edit ' + r.name} onClick={() => setEditing({ ...r })}><Pencil size={16}/></button><button aria-label={'Delete ' + r.name} onClick={() => setDeleting(r)}><Trash2 size={16}/></button></div>}</TableCell></TableRow>)}</TableBody></Table></div>}{!rows.length && !loading && <div className="empty"><BookOpen size={30}/><h3>No {module} yet.</h3><p>{['customers', 'audit'].includes(module) ? 'Activity will appear here.' : 'Add your first record to get started.'}</p></div>}<div className="pagination"><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page}</span><button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</button></div></section>}</div></div>
    <Dialog open={!!editing} onOpenChange={v => { if (!v)
        setEditing(null); }}><DialogContent className="edit-dialog"><DialogTitle>{editing?.id ? 'Edit' : 'Create'} {title(module)}</DialogTitle><DialogDescription>{demo ? 'Preview changes stay in this session.' : 'Save content to your kitchen database.'}</DialogDescription><form className="form-stack" onSubmit={save}><label>Name / heading<input required maxLength={160} value={editing?.name || ''} onChange={e => field('name', e.target.value)}/></label><label>Description<textarea rows={4} value={editing?.description || ''} onChange={e => field('description', e.target.value)}/></label>{module === 'categories' && choose('sectionId', 'Section', (data.sections as RecordData[]))}{module === 'items' && choose('categoryId', 'Category', (data.categories as RecordData[]))}{module === 'variants' && choose('itemId', 'Item', data.items as RecordData[])}{module === 'addons' && choose('groupId', 'Add-on group', data['addon-groups'] as RecordData[])}{['items', 'variants', 'addons'].includes(module) && <label>Price (₹)<input type="number" min={0} step="0.01" required value={Number(editing?.price || 0)} onChange={e => field('price', Number(e.target.value))}/></label>}{module === 'items' && <><label className="switch-label"><Switch checked={!!editing?.veg} onCheckedChange={v => field('veg', v)}/> Vegetarian</label><label className="switch-label"><Switch checked={!!editing?.bestseller} onCheckedChange={v => field('bestseller', v)}/> Featured item</label><label>Preparation time (minutes)<input type="number" min={0} max={240} value={Number(editing?.prepTime || 25)} onChange={e => field('prepTime', Number(e.target.value))}/></label></>}<label>Image URL<input value={String(editing?.image || '')} onChange={e => field('image', e.target.value)} placeholder="https://… or uploaded image"/></label><label className="upload"><Upload size={17}/> Upload image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={demo} onChange={async (e) => { const file = e.target.files?.[0]; if (!file)
        return; const f = new FormData(); f.append('image', file); try {
        const r = await fetch('/api/admin/media', { method: 'POST', body: f });
        const d: any = await r.json();
        if (!r.ok)
            throw Error(d.error);
        field('image', d.url);
    }
    catch (e) {
        setError((e as Error).message);
    } }}/></label>{module === 'hero' && <label>Button text<input value={String(editing?.cta || '')} onChange={e => field('cta', e.target.value)}/></label>}<label>Display order<input type="number" min={0} value={Number(editing?.sortOrder || 0)} onChange={e => field('sortOrder', Number(e.target.value))}/></label><label className="switch-label"><Switch checked={editing?.active !== false} onCheckedChange={v => field('active', v)}/> Visible / active</label>{error && <div className="error">{error}</div>}<button className="primary">Save changes <Check size={17}/></button></form></DialogContent></Dialog><AlertDialog open={!!deleting} onOpenChange={v => { if (!v)
        setDeleting(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle><AlertDialogDescription>This record will be removed from the active CMS. Records with children must be cleared first.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep record</AlertDialogCancel><AlertDialogAction onClick={remove}>Delete record</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>;
}
