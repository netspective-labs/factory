function e(e, t) {
    for(let r in e)t(e[r], r);
}
function t(e, t) {
    e.forEach(t);
}
function r(e, t) {
    if (!e) throw Error(t);
}
function a({ node: e = [] , from: r , source: n , parent: a = r || n , to: o , target: i , child: l = o || i , scope: s = {} , meta: f = {} , family: u = {
    type: 'regular'
} , regional: c  } = {}) {
    let d = ye(a), p = ye(u.links), m = ye(u.owners), g = [];
    t(e, (e)=>e && K(g, e));
    let h = {
        id: ce(),
        seq: g,
        next: ye(l),
        meta: f,
        scope: s,
        family: {
            type: u.type || "crosslink",
            links: p,
            owners: m
        }
    };
    return t(p, (e)=>K(Y(e), h)), t(m, (e)=>K(Z(e), h)), t(d, (e)=>K(e.next, h)), c && de && he(te(de), [
        h
    ]), h;
}
function o(e, r, n) {
    let a = Ze, o = null, i = Ke;
    if (e.target && (r = e.params, n = e.defer, a = 'page' in e ? e.page : a, e.stack && (o = e.stack), i = ae(e) || i, e = e.target), i && Ke && i !== Ke && (Ke = null), Array.isArray(e)) for(let t1 = 0; t1 < e.length; t1++)He('pure', a, X(e[t1]), o, r[t1], i);
    else He('pure', a, X(e), o, r, i);
    if (n && !Qe) return;
    let l, s, f, u, c, d, p = {
        isRoot: Qe,
        currentPage: Ze,
        scope: Ke,
        isWatch: Xe,
        isPure: Ye
    };
    Qe = 0;
    e: for(; u = We();){
        let { idx: e1 , stack: r1 , type: n1  } = u;
        f = r1.node, Ze = c = r1.page, Ke = ae(r1), c ? d = c.reg : Ke && (d = Ke.reg);
        let a1 = !!c, o1 = !!Ke, i1 = {
            fail: 0,
            scope: f.scope
        };
        l = s = 0;
        for(let t2 = e1; t2 < f.seq.length && !l; t2++){
            let u1 = f.seq[t2];
            if (u1.order) {
                let { priority: a2 , barrierID: o2  } = u1.order, i2 = o2 ? c ? `${c.fullID}_${o2}` : o2 : 0;
                if (t2 !== e1 || n1 !== a2) {
                    o2 ? Je.has(i2) || (Je.add(i2), Ue(t2, r1, a2, o2)) : Ue(t2, r1, a2);
                    continue e;
                }
                o2 && Je.delete(i2);
            }
            switch(u1.type){
                case 'mov':
                    {
                        let e2, t3 = u1.data;
                        switch(t3.from){
                            case _:
                                e2 = te(r1);
                                break;
                            case "a":
                            case 'b':
                                e2 = r1[t3.from];
                                break;
                            case "value":
                                e2 = t3.store;
                                break;
                            case "store":
                                if (d && !d[t3.store.id]) if (a1) {
                                    let e3 = rt(c, t3.store.id);
                                    r1.page = c = e3, e3 ? d = e3.reg : o1 ? (at(Ke, t3.store, 0, 1, t3.softRead), d = Ke.reg) : d = void 0;
                                } else o1 && at(Ke, t3.store, 0, 1, t3.softRead);
                                e2 = _e(d && d[t3.store.id] || t3.store);
                        }
                        switch(t3.to){
                            case _:
                                r1.value = e2;
                                break;
                            case "a":
                            case 'b':
                                r1[t3.to] = e2;
                                break;
                            case "store":
                                nt(c, Ke, f, t3.target).current = e2;
                        }
                        break;
                    }
                case 'compute':
                    let e4 = u1.data;
                    if (e4.fn) {
                        Xe = 'watch' === oe(f, 'op'), Ye = e4.pure;
                        let t4 = e4.safe ? (0, e4.fn)(te(r1), i1.scope, r1) : ot(i1, e4.fn, r1);
                        e4.filter ? s = !t4 : r1.value = t4, Xe = p.isWatch, Ye = p.isPure;
                    }
            }
            l = i1.fail || s;
        }
        if (!l) {
            let e5 = te(r1);
            t(f.next, (t)=>{
                He('child', c, t, r1, e5, ae(r1));
            });
            let n2 = ae(r1);
            if (n2) {
                oe(f, 'needFxCounter') && He('child', c, n2.fxCount, r1, e5, n2), oe(f, 'storeChange') && He('child', c, n2.storeChange, r1, e5, n2), oe(f, 'warnSerialize') && He('child', c, n2.warnSerializeNode, r1, e5, n2);
                let a3 = n2.additionalLinks[f.id];
                a3 && t(a3, (t)=>{
                    He('child', c, t, r1, e5, n2);
                });
            }
        }
    }
    Qe = p.isRoot, Ze = p.currentPage, Ke = ae(p);
}
function s(e, t) {
    let r, n, a = e;
    if (t) {
        let a1 = le(t);
        0 === e.length ? (r = a1.path, n = a1.fullName) : (r = a1.path.concat([
            e
        ]), n = 0 === a1.fullName.length ? e : a1.fullName + '/' + e);
    } else r = 0 === e.length ? [] : [
        e
    ], n = e;
    return {
        shortName: a,
        fullName: n,
        path: r
    };
}
function u(e, ...t) {
    let r = pe();
    if (r) {
        let n = r.handlers[e];
        if (n) return n(r, ...t);
    }
}
function c(e, t) {
    let r = (e, ...t)=>(Q(!oe(r, 'derived'), 'call of derived event', 'createEvent'), Q(!Ye, 'unit call from pure function', 'operators like sample'), Ze ? ((e, t, r, n)=>{
            let a = Ze, o = null;
            if (t) for(o = Ze; o && o.template !== t;)o = ne(o);
            tt(o);
            let i = e.create(r, n);
            return tt(a), i;
        })(r, n, e, t) : r.create(e, t)), n = pe();
    return Object.assign(r, {
        graphite: a({
            meta: yt("event", r, e, t),
            regional: 1
        }),
        create: (e)=>(o({
                target: r,
                params: e,
                scope: Ke
            }), e),
        watch: (e)=>gt(r, e),
        map: (e)=>bt(r, P, e, [
                De()
            ]),
        filter: (e)=>bt(r, "filter", e.fn ? e : e.fn, [
                De(Me, 1)
            ]),
        filterMap: (e)=>bt(r, 'filterMap', e, [
                De(),
                Oe((e)=>!ke(e), 1)
            ]),
        prepend (e) {
            let t = c('* \u2192 ' + r.shortName, {
                parent: ne(r)
            });
            return u('eventPrepend', X(t)), pt(t, r, [
                De()
            ], 'prepend', e), ht(r, t), t;
        }
    });
}
function d(e, n) {
    let i = Pe(e), l = c({
        named: 'updates',
        derived: 1
    });
    u('storeBase', i);
    let s = i.id, f = {
        subscribers: new Map,
        updates: l,
        defaultState: e,
        stateRef: i,
        getState () {
            let e, t = i;
            if (Ze) {
                let t1 = Ze;
                for(; t1 && !t1.reg[s];)t1 = ne(t1);
                t1 && (e = t1);
            }
            return !e && Ke && (at(Ke, i, 1), e = Ke), e && (t = e.reg[s]), _e(t);
        },
        setState: (e)=>o({
                target: f,
                params: e,
                defer: 1,
                scope: Ke
            }),
        reset: (...e)=>(t(e, (e)=>f.on(e, ()=>f.defaultState)), f),
        on: (e, r)=>(xe(e, '.on', 'first argument'), Q(!oe(f, 'derived'), '.on in derived store', 'createStore'), t(Array.isArray(e) ? e : [
                e
            ], (e)=>{
                f.off(e), re(f).set(e, dt(vt(e, f, 'on', je, r)));
            }), f),
        off (e) {
            let t = re(f).get(e);
            return t && (t(), re(f).delete(e)), f;
        },
        map (e, t) {
            let r, n;
            be(e) && (r = e, e = e.fn), Q(ke(t), 'second argument of store.map', 'updateFilter');
            let a = f.getState();
            pe() ? n = null : ke(a) || (n = e(a, t));
            let o = d(n, {
                name: `${f.shortName} \u2192 *`,
                derived: 1,
                and: r
            }), l = vt(f, o, P, $e, e);
            return Ee(ee(o), {
                type: P,
                fn: e,
                from: i
            }), ee(o).noInit = 1, u('storeMap', i, l), o;
        },
        watch (e, t) {
            if (!t || !E(e)) {
                let t1 = gt(f, e);
                return u('storeWatch', i, e) || e(f.getState()), t1;
            }
            return r(ve(t), 'second argument should be a function'), e.watch((e)=>t(f.getState(), e));
        }
    }, p = yt("store", f, n), m = f.defaultConfig.updateFilter;
    f.graphite = a({
        scope: {
            state: i,
            fn: m
        },
        node: [
            Oe((e, t, r)=>(r.scope && !r.scope.reg[i.id] && (r.b = 1), e)),
            Fe(i),
            Oe((e, t, { a: r , b: n  })=>!ke(e) && (e !== r || n), 1),
            m && De($e, 1),
            qe({
                from: _,
                target: i
            })
        ],
        child: l,
        meta: p,
        regional: 1
    });
    let g = oe(f, 'derived'), h = 'ignore' === oe(f, 'serialize'), y = oe(f, 'sid');
    return y && (h || ie(f, 'storeChange', 1), i.sid = y), y || h || g || ie(f, 'warnSerialize', 1), r(g || !ke(e), "current state can't be undefined, use null instead"), he(f, [
        l
    ]), f;
}
function g() {
    let e = {};
    return e.req = new Promise((t, r)=>{
        e.rs = t, e.rj = r;
    }), e.req.catch(()=>{}), e;
}
function h(e, t) {
    let n = c(ve(e) ? {
        handler: e
    } : e, t), i = X(n);
    ie(i, 'op', n.kind = "effect"), n.use = (e)=>(r(ve(e), '.use argument should be a function'), m.scope.handler = e, n), n.use.getCurrent = ()=>m.scope.handler;
    let l = n.finally = c({
        named: 'finally',
        derived: 1
    }), s = n.done = l.filterMap({
        named: 'done',
        fn ({ status: e , params: t , result: r  }) {
            if ('done' === e) return {
                params: t,
                result: r
            };
        }
    }), f = n.fail = l.filterMap({
        named: 'fail',
        fn ({ status: e , params: t , error: r  }) {
            if ('fail' === e) return {
                params: t,
                error: r
            };
        }
    }), u = n.doneData = s.map({
        named: 'doneData',
        fn: ({ result: e  })=>e
    }), p = n.failData = f.map({
        named: 'failData',
        fn: ({ error: e  })=>e
    }), m = a({
        scope: {
            handlerId: oe(i, 'sid'),
            handler: n.defaultConfig.handler || (()=>r(0, `no handler used in ${n.getType()}`))
        },
        node: [
            Oe((e, t, r)=>{
                let n = t, a = n.handler;
                if (ae(r)) {
                    let e1 = ae(r).handlers[n.handlerId];
                    e1 && (a = e1);
                }
                return e.handler = a, e;
            }, 0, 1),
            Oe(({ params: e , req: t , handler: r , args: n = [
                e
            ]  }, a, o)=>{
                let i = St(e, t, 1, l, o), s = St(e, t, 0, l, o), [f, u] = wt(r, s, n);
                f && (be(u) && ve(u.then) ? u.then(i, s) : i(u));
            }, 0, 1)
        ],
        meta: {
            op: 'fx',
            fx: 'runner'
        }
    });
    i.scope.runner = m, K(i.seq, Oe((e, { runner: t  }, r)=>{
        let n = ne(r) ? {
            params: e,
            req: {
                rs (e) {},
                rj (e) {}
            }
        } : e;
        return o({
            target: t,
            params: n,
            defer: 1,
            scope: ae(r)
        }), n.params;
    }, 0, 1)), n.create = (e)=>{
        let t = g(), r = {
            params: e,
            req: t
        };
        if (Ke) {
            if (!Xe) {
                let e1 = Ke;
                t.req.finally(()=>{
                    et(e1);
                }).catch(()=>{});
            }
            o({
                target: n,
                params: r,
                scope: Ke
            });
        } else o(n, r);
        return t.req;
    };
    let h = n.inFlight = d(0, {
        serialize: 'ignore'
    }).on(n, (e)=>e + 1).on(l, (e)=>e - 1).map({
        fn: (e)=>e,
        named: 'inFlight'
    });
    ie(l, 'needFxCounter', 'dec'), ie(n, 'needFxCounter', 1);
    let y = n.pending = h.map({
        fn: (e)=>e > 0,
        named: 'pending'
    });
    return he(n, [
        l,
        s,
        f,
        u,
        p,
        y,
        h
    ]), n;
}
function v(r, n) {
    let i = a({
        family: {
            type: "domain"
        },
        regional: 1
    }), l = {
        history: {},
        graphite: i,
        hooks: {}
    };
    i.meta = yt("domain", l, r, n), e({
        Event: c,
        Effect: h,
        Store: d,
        Domain: v
    }, (e, r)=>{
        let n = r.toLowerCase(), a = c({
            named: `on${r}`
        });
        l.hooks[n] = a;
        let i = new Set;
        l.history[`${n}s`] = i, a.create = (e)=>(o(a, e), e), K(X(a).seq, Oe((e, t, r)=>(r.scope = null, e))), a.watch((e)=>{
            he(l, [
                e
            ]), i.add(e), e.ownerSet || (e.ownerSet = i), ne(e) || (e.parent = l);
        }), he(l, [
            a
        ]), l[`onCreate${r}`] = (e)=>(t(i, e), a.watch(e)), l[`create${r}`] = l[n] = (t, r)=>a(e(t, {
                parent: l,
                or: r
            }));
    });
    let s = ne(l);
    return s && e(l.hooks, (e, t)=>pt(e, s.hooks[t])), l;
}
let R = 'undefined' != typeof Symbol && Symbol.observable || '@@observable', P = 'map', _ = 'stack', E = (e)=>(ve(e) || be(e)) && 'kind' in e;
const V = (e)=>(t)=>E(t) && t.kind === e;
let L = V("store"), T = V("event"), B = V("effect"), W = V("domain"), H = V("scope");
let J = (e, t)=>{
    let r = e.indexOf(t);
    -1 !== r && e.splice(r, 1);
}, K = (e, t)=>e.push(t), Q = (e, t, r)=>!e && console.error(`${t} is deprecated${r ? `, use ${r} instead` : ''}`), X = (e)=>e.graphite || e, Y = (e)=>e.family.owners, Z = (e)=>e.family.links, ee = (e)=>e.stateRef, te = (e)=>e.value, re = (e)=>e.subscribers, ne = (e)=>e.parent, ae = (e)=>e.scope, oe = (e, t)=>X(e).meta[t], ie = (e, t, r)=>X(e).meta[t] = r, le = (e)=>e.compositeName;
const se = ()=>{
    let e = 0;
    return ()=>"" + ++e;
};
let fe = se(), ue = se(), ce = se(), de = null, pe = ()=>de && de.template, me = (e)=>(e && de && de.sidRoot && (e = `${de.sidRoot}|${e}`), e), he = (e, r)=>{
    let n = X(e);
    t(r, (e)=>{
        let t = X(e);
        "domain" !== n.family.type && (t.family.type = "crosslink"), K(Y(t), n), K(Z(n), t);
    });
}, ye = (e = [])=>(Array.isArray(e) ? e : [
        e
    ]).flat().map(X), be = (e)=>'object' == typeof e && null !== e, ve = (e)=>'function' == typeof e, ke = (e)=>void 0 === e, we = (e)=>r(be(e) || ve(e), 'expect first argument be an object');
const Se = (e, t, n, a)=>r(!(!be(e) && !ve(e) || !('family' in e) && !('graphite' in e)), `${t}: expect ${n} to be a unit (store, event or effect)${a}`);
let xe = (e, r, n)=>{
    Array.isArray(e) ? t(e, (e, t)=>Se(e, r, `${t} item of ${n}`, '')) : Se(e, r, n, ' or array of units');
}, $e = (e, { fn: t  }, { a: r  })=>t(e, r), je = (e, { fn: t  }, { a: r  })=>t(r, e), Me = (e, { fn: t  })=>t(e);
const Ae = (e, t, r, n)=>{
    let a = {
        id: ue(),
        type: e,
        data: t
    };
    return r && (a.order = {
        priority: r
    }, n && (a.order.barrierID = ++Ie)), a;
};
let Ie = 0, qe = ({ from: e = "store" , store: t , target: r , to: n = r ? "store" : _ , batch: a , priority: o  })=>Ae('mov', {
        from: e,
        store: t,
        to: n,
        target: r
    }, o, a), Ne = ({ fn: e , batch: t , priority: r , safe: n = 0 , filter: a = 0 , pure: o = 0  })=>Ae('compute', {
        fn: e,
        safe: n,
        filter: a,
        pure: o
    }, r, t), ze = ({ fn: e  })=>Ne({
        fn: e,
        priority: "effect"
    }), Oe = (e, t, r)=>Ne({
        fn: e,
        safe: 1,
        filter: t,
        priority: r && "effect"
    }), Fe = (e, t, r)=>qe({
        store: e,
        to: t ? _ : "a",
        priority: r && "sampler",
        batch: 1
    }), De = (e = Me, t)=>Ne({
        fn: e,
        pure: 1,
        filter: t
    }), Pe = (e)=>({
        id: ue(),
        current: e
    }), _e = ({ current: e  })=>e, Ee = (e, t)=>{
    e.before || (e.before = []), K(e.before, t);
}, Ve = null;
const Le = (e, t)=>{
    if (!e) return t;
    if (!t) return e;
    let r;
    return (e.v.type === t.v.type && e.v.id > t.v.id || Ge(e.v.type) > Ge(t.v.type)) && (r = e, e = t, t = r), r = Le(e.r, t), e.r = e.l, e.l = r, e;
}, Te = [];
let Be = 0;
for(; Be < 6;)K(Te, {
    first: null,
    last: null,
    size: 0
}), Be += 1;
const We = ()=>{
    for(let e = 0; e < 6; e++){
        let t = Te[e];
        if (t.size > 0) {
            if (3 === e || 4 === e) {
                t.size -= 1;
                let e1 = Ve.v;
                return Ve = Le(Ve.l, Ve.r), e1;
            }
            1 === t.size && (t.last = null);
            let r = t.first;
            return t.first = r.r, t.size -= 1, r.v;
        }
    }
}, He = (e, t, r, n, a, o)=>Ue(0, {
        a: null,
        b: null,
        node: r,
        parent: n,
        value: a,
        page: t,
        scope: o
    }, e), Ue = (e, t, r, n = 0)=>{
    let a = Ge(r), o = Te[a], i = {
        v: {
            idx: e,
            stack: t,
            type: r,
            id: n
        },
        l: null,
        r: null
    };
    3 === a || 4 === a ? Ve = Le(Ve, i) : (0 === o.size ? o.first = i : o.last.r = i, o.last = i), o.size += 1;
}, Ge = (e)=>{
    switch(e){
        case 'child':
            return 0;
        case 'pure':
            return 1;
        case 'read':
            return 2;
        case "barrier":
            return 3;
        case "sampler":
            return 4;
        case "effect":
            return 5;
        default:
            return -1;
    }
}, Je = new Set;
let Ke, Qe = 1, Xe = 0, Ye = 0, Ze = null, et = (e)=>{
    Ke = e;
}, tt = (e)=>{
    Ze = e;
};
const rt = (e, t)=>{
    if (e) {
        for(; e && !e.reg[t];)e = ne(e);
        if (e) return e;
    }
    return null;
};
let nt = (e, t, r, n, a)=>{
    let o = rt(e, n.id);
    return o ? o.reg[n.id] : t ? (at(t, n, a), t.reg[n.id]) : n;
}, at = (e, r, n, a, o)=>{
    let i = e.reg, l = r.sid;
    if (i[r.id]) return;
    let s = {
        id: r.id,
        current: r.current
    };
    if (l && l in e.sidValuesMap && !(l in e.sidIdMap)) s.current = e.sidValuesMap[l];
    else if (r.before && !o) {
        let o1 = 0, l1 = n || !r.noInit || a;
        t(r.before, (t)=>{
            switch(t.type){
                case P:
                    {
                        let r = t.from;
                        if (r || t.fn) {
                            r && at(e, r, n, a);
                            let o = r && i[r.id].current;
                            l1 && (s.current = t.fn ? t.fn(o) : o);
                        }
                        break;
                    }
                case 'field':
                    o1 || (o1 = 1, s.current = Array.isArray(s.current) ? [
                        ...s.current
                    ] : {
                        ...s.current
                    }), at(e, t.from, n, a), l1 && (s.current[t.field] = i[i[t.from.id].id].current);
            }
        });
    }
    l && (e.sidIdMap[l] = r.id), i[r.id] = s;
};
const ot = (e, t, r)=>{
    try {
        return t(te(r), e.scope, r);
    } catch (t1) {
        console.error(t1), e.fail = 1;
    }
};
let lt = (t, r = {})=>(be(t) && (lt(t.or, r), e(t, (e, t)=>{
        ke(e) || 'or' === t || 'and' === t || (r[t] = e);
    }), lt(t.and, r)), r);
const st = (e, t)=>{
    J(e.next, t), J(Y(e), t), J(Z(e), t);
}, ft = (e, t, r)=>{
    let n;
    e.next.length = 0, e.seq.length = 0, e.scope = null;
    let a = Z(e);
    for(; n = a.pop();)st(n, e), (t || r && 'sample' !== oe(e, 'op') || "crosslink" === n.family.type) && ft(n, t, 'on' !== oe(n, 'op') && r);
    for(a = Y(e); n = a.pop();)st(n, e), r && "crosslink" === n.family.type && ft(n, t, 'on' !== oe(n, 'op') && r);
}, ut = (e)=>e.clear();
let ct = (e, { deep: t  } = {})=>{
    let r = 0;
    if (e.ownerSet && e.ownerSet.delete(e), L(e)) ut(re(e));
    else if (W(e)) {
        r = 1;
        let t1 = e.history;
        ut(t1.events), ut(t1.effects), ut(t1.stores), ut(t1.domains);
    }
    ft(X(e), !!t, r);
}, dt = (e)=>{
    let t = ()=>ct(e);
    return t.unsubscribe = t, t;
}, pt = (e, t, r, n, o)=>a({
        node: r,
        parent: e,
        child: t,
        scope: {
            fn: o
        },
        meta: {
            op: n
        },
        family: {
            owners: [
                e,
                t
            ],
            links: t
        },
        regional: 1
    }), gt = (e, t)=>(r(ve(t), '.watch argument should be a function'), dt(a({
        scope: {
            fn: t
        },
        node: [
            ze({
                fn: Me
            })
        ],
        parent: e,
        meta: {
            op: 'watch'
        },
        family: {
            owners: e
        },
        regional: 1
    }))), ht = (e, t, r = "event")=>{
    ne(e) && ne(e).hooks[r](t);
}, yt = (e, t, r, n)=>{
    let a = "domain" === e, o = fe(), i = lt({
        or: n,
        and: 'string' == typeof r ? {
            name: r
        } : r
    }), { parent: l = null , sid: f = null , named: u = null  } = i, c = u || i.name || (a ? '' : o), d = s(c, l), p = {
        op: t.kind = e,
        name: t.shortName = c,
        sid: t.sid = me(f),
        named: u,
        unitId: t.id = o,
        serialize: i.serialize,
        derived: i.derived,
        config: i
    };
    if (t.parent = l, t.compositeName = d, t.defaultConfig = i, t.thru = (e)=>(Q(0, 'thru', 'js pipe'), e(t)), t.getType = ()=>d.fullName, !a) {
        t.subscribe = (e)=>(we(e), t.watch(ve(e) ? e : (t)=>e.next && e.next(t))), t[R] = ()=>t;
        let e1 = pe();
        e1 && (p.nativeTemplate = e1);
    }
    return p;
};
const bt = (e, t, r, n)=>{
    let a;
    be(r) && (a = r, r = r.fn);
    let o = c({
        name: `${e.shortName} \u2192 *`,
        derived: 1,
        and: a
    });
    return pt(e, o, n, t, r), o;
}, vt = (e, t, r, n, a)=>{
    let o = ee(t), i = qe({
        store: o,
        to: "a",
        priority: 'read'
    });
    r === P && (i.data.softRead = 1);
    let l = [
        i,
        De(n)
    ];
    return u('storeOnMap', o, l, L(e) && ee(e)), pt(e, t, l, r, a);
};
let wt = (e, t, r)=>{
    try {
        return [
            1,
            e(...r)
        ];
    } catch (e1) {
        return t(e1), [
            0,
            null
        ];
    }
}, St = (e, t, r, n, a)=>(i)=>o({
            target: [
                n,
                xt
            ],
            params: [
                r ? {
                    status: 'done',
                    params: e,
                    result: i
                } : {
                    status: 'fail',
                    params: e,
                    error: i
                },
                {
                    value: i,
                    fn: r ? t.rs : t.rj
                }
            ],
            defer: 1,
            page: a.page,
            scope: ae(a)
        });
const xt = a({
    node: [
        ze({
            fn: ({ fn: e , value: t  })=>e(t)
        })
    ],
    meta: {
        op: 'fx',
        fx: 'sidechain'
    }
});
function esTunnel(options) {
    const { constructEventSource , domain =v("esTunnel") , maxReconnectAttempts =30 , millisecsBetweenReconnectAttempts =1000 ,  } = options;
    let eventSource = undefined;
    const connect = domain.createEvent("connect");
    const connected = domain.createEvent("connected");
    const reconnect = domain.createEvent("reconnect");
    const abort = domain.createEvent("abort");
    const $status = domain.createStore("initial").on(connect, (_, payload)=>`connecting ${payload.attempt ?? 1}/${maxReconnectAttempts}`).on(connected, ()=>"connected").on(reconnect, (_, payload)=>`connecting ${payload.attempt}/${maxReconnectAttempts}`).on(abort, ()=>`aborted after ${maxReconnectAttempts} tries`);
    connect.watch(({ validateURL , esURL , attempt =0  })=>{
        if (eventSource) eventSource.close();
        if (attempt > maxReconnectAttempts) {
            abort({
                validateURL,
                esURL,
                attempt,
                why: "max-reconnect-attempts-exceeded"
            });
            return;
        }
        fetch(validateURL).then((resp)=>{
            if (resp.ok) {
                eventSource = constructEventSource(esURL);
                eventSource.onopen = (esOnOpenEvent)=>connected({
                        esOnOpenEvent,
                        eventSource,
                        esURL,
                        validateURL,
                        attempt
                    });
                eventSource.onerror = (esOnErrorEvent)=>reconnect({
                        attempt,
                        esOnErrorEvent,
                        esURL,
                        validateURL,
                        why: "event-source-error"
                    });
            } else {
                reconnect({
                    attempt,
                    esURL,
                    validateURL,
                    why: "fetch-resp-not-ok",
                    httpStatus: resp.status,
                    httpStatusText: resp.statusText
                });
            }
        }).catch((fetchError)=>reconnect({
                attempt,
                fetchError,
                esURL,
                validateURL,
                why: "fetch-failed"
            }));
    });
    reconnect.watch((payload)=>{
        setTimeout(()=>connect({
                validateURL: payload.validateURL,
                esURL: payload.esURL,
                attempt: payload.attempt + 1
            }), millisecsBetweenReconnectAttempts);
    });
    return {
        connect,
        connected,
        reconnect,
        abort,
        $status
    };
}
function wsTunnel(options) {
    const { constructWebSocket , domain =v("wsTunnel") , maxReconnectAttempts =30 , millisecsBetweenReconnectAttempts =1000 , allowClose =false ,  } = options;
    let webSocket = undefined;
    const connect = domain.createEvent("connect");
    const connected = domain.createEvent("connected");
    const reconnect = domain.createEvent("reconnect");
    const abort = domain.createEvent("abort");
    const $status = domain.createStore("initial").on(connect, (_, payload)=>`connecting ${payload.attempt ?? 1}/${maxReconnectAttempts}`).on(connected, ()=>"connected").on(reconnect, (_, payload)=>`connecting ${payload.attempt}/${maxReconnectAttempts}`).on(abort, ()=>`aborted after ${maxReconnectAttempts} tries`);
    connect.watch(({ validateURL , wsURL , attempt =0  })=>{
        if (webSocket) webSocket.close();
        if (attempt > maxReconnectAttempts) {
            abort({
                validateURL,
                wsURL,
                attempt,
                why: "max-reconnect-attempts-exceeded"
            });
            return;
        }
        fetch(validateURL).then((resp)=>{
            if (resp.ok) {
                webSocket = constructWebSocket(wsURL);
                webSocket.onopen = (wsOnOpenEvent)=>connected({
                        wsOnOpenEvent,
                        webSocket,
                        wsURL,
                        validateURL,
                        attempt
                    });
                webSocket.onclose = (wsOnCloseEvent)=>{
                    if (!allowClose) {
                        reconnect({
                            attempt,
                            wsOnCloseEvent,
                            wsURL,
                            validateURL,
                            why: "web-socket-close-not-allowed"
                        });
                    }
                };
                webSocket.onerror = (wsOnErrorEvent)=>reconnect({
                        attempt,
                        wsOnErrorEvent,
                        wsURL,
                        validateURL,
                        why: "web-socket-error"
                    });
            } else {
                reconnect({
                    attempt,
                    wsURL,
                    validateURL,
                    why: "fetch-resp-not-ok",
                    httpStatus: resp.status,
                    httpStatusText: resp.statusText
                });
            }
        }).catch((fetchError)=>reconnect({
                attempt,
                fetchError,
                wsURL,
                validateURL,
                why: "fetch-failed"
            }));
    });
    reconnect.watch((payload)=>{
        setTimeout(()=>connect({
                validateURL: payload.validateURL,
                wsURL: payload.wsURL,
                attempt: payload.attempt + 1
            }), millisecsBetweenReconnectAttempts);
    });
    return {
        connect,
        connected,
        reconnect,
        abort,
        $status
    };
}
export { esTunnel as esTunnel };
export { wsTunnel as wsTunnel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vdW5wa2cuY29tL2VmZmVjdG9yQDIyLjMuMC9lZmZlY3Rvci5tanMiLCJmaWxlOi8vL2hvbWUvc25zaGFoL3dvcmtzcGFjZXMvZ2l0aHViLmNvbS9yZXNGYWN0b3J5L2ZhY3RvcnkvbGliL3R1bm5lbC9tb2QuanMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiZnVuY3Rpb24gZShlLHQpe2ZvcihsZXQgciBpbiBlKXQoZVtyXSxyKX1mdW5jdGlvbiB0KGUsdCl7ZS5mb3JFYWNoKHQpfWZ1bmN0aW9uIHIoZSx0KXtpZighZSl0aHJvdyBFcnJvcih0KX1mdW5jdGlvbiBuKGUsdCl7ZGU9e3BhcmVudDpkZSx2YWx1ZTplLHRlbXBsYXRlOm9lKGUsJ3RlbXBsYXRlJyl8fHBlKCksc2lkUm9vdDpvZShlLCdzaWRSb290Jyl8fGRlJiZkZS5zaWRSb290fTt0cnl7cmV0dXJuIHQoKX1maW5hbGx5e2RlPW5lKGRlKX19ZnVuY3Rpb24gYSh7bm9kZTplPVtdLGZyb206cixzb3VyY2U6bixwYXJlbnQ6YT1yfHxuLHRvOm8sdGFyZ2V0OmksY2hpbGQ6bD1vfHxpLHNjb3BlOnM9e30sbWV0YTpmPXt9LGZhbWlseTp1PXt0eXBlOidyZWd1bGFyJ30scmVnaW9uYWw6Y309e30pe2xldCBkPXllKGEpLHA9eWUodS5saW5rcyksbT15ZSh1Lm93bmVycyksZz1bXTt0KGUsKGU9PmUmJksoZyxlKSkpO2xldCBoPXtpZDpjZSgpLHNlcTpnLG5leHQ6eWUobCksbWV0YTpmLHNjb3BlOnMsZmFtaWx5Ont0eXBlOnUudHlwZXx8XCJjcm9zc2xpbmtcIixsaW5rczpwLG93bmVyczptfX07cmV0dXJuIHQocCwoZT0+SyhZKGUpLGgpKSksdChtLChlPT5LKFooZSksaCkpKSx0KGQsKGU9PksoZS5uZXh0LGgpKSksYyYmZGUmJmhlKHRlKGRlKSxbaF0pLGh9ZnVuY3Rpb24gbyhlLHIsbil7bGV0IGE9WmUsbz1udWxsLGk9S2U7aWYoZS50YXJnZXQmJihyPWUucGFyYW1zLG49ZS5kZWZlcixhPSdwYWdlJ2luIGU/ZS5wYWdlOmEsZS5zdGFjayYmKG89ZS5zdGFjayksaT1hZShlKXx8aSxlPWUudGFyZ2V0KSxpJiZLZSYmaSE9PUtlJiYoS2U9bnVsbCksQXJyYXkuaXNBcnJheShlKSlmb3IobGV0IHQ9MDt0PGUubGVuZ3RoO3QrKylIZSgncHVyZScsYSxYKGVbdF0pLG8sclt0XSxpKTtlbHNlIEhlKCdwdXJlJyxhLFgoZSksbyxyLGkpO2lmKG4mJiFRZSlyZXR1cm47bGV0IGwscyxmLHUsYyxkLHA9e2lzUm9vdDpRZSxjdXJyZW50UGFnZTpaZSxzY29wZTpLZSxpc1dhdGNoOlhlLGlzUHVyZTpZZX07UWU9MDtlOmZvcig7dT1XZSgpOyl7bGV0e2lkeDplLHN0YWNrOnIsdHlwZTpufT11O2Y9ci5ub2RlLFplPWM9ci5wYWdlLEtlPWFlKHIpLGM/ZD1jLnJlZzpLZSYmKGQ9S2UucmVnKTtsZXQgYT0hIWMsbz0hIUtlLGk9e2ZhaWw6MCxzY29wZTpmLnNjb3BlfTtsPXM9MDtmb3IobGV0IHQ9ZTt0PGYuc2VxLmxlbmd0aCYmIWw7dCsrKXtsZXQgdT1mLnNlcVt0XTtpZih1Lm9yZGVyKXtsZXR7cHJpb3JpdHk6YSxiYXJyaWVySUQ6b309dS5vcmRlcixpPW8/Yz9gJHtjLmZ1bGxJRH1fJHtvfWA6bzowO2lmKHQhPT1lfHxuIT09YSl7bz9KZS5oYXMoaSl8fChKZS5hZGQoaSksVWUodCxyLGEsbykpOlVlKHQscixhKTtjb250aW51ZSBlfW8mJkplLmRlbGV0ZShpKX1zd2l0Y2godS50eXBlKXtjYXNlJ21vdic6e2xldCBlLHQ9dS5kYXRhO3N3aXRjaCh0LmZyb20pe2Nhc2UgXzplPXRlKHIpO2JyZWFrO2Nhc2VcImFcIjpjYXNlJ2InOmU9clt0LmZyb21dO2JyZWFrO2Nhc2VcInZhbHVlXCI6ZT10LnN0b3JlO2JyZWFrO2Nhc2VcInN0b3JlXCI6aWYoZCYmIWRbdC5zdG9yZS5pZF0paWYoYSl7bGV0IGU9cnQoYyx0LnN0b3JlLmlkKTtyLnBhZ2U9Yz1lLGU/ZD1lLnJlZzpvPyhhdChLZSx0LnN0b3JlLDAsMSx0LnNvZnRSZWFkKSxkPUtlLnJlZyk6ZD12b2lkIDB9ZWxzZSBvJiZhdChLZSx0LnN0b3JlLDAsMSx0LnNvZnRSZWFkKTtlPV9lKGQmJmRbdC5zdG9yZS5pZF18fHQuc3RvcmUpfXN3aXRjaCh0LnRvKXtjYXNlIF86ci52YWx1ZT1lO2JyZWFrO2Nhc2VcImFcIjpjYXNlJ2InOnJbdC50b109ZTticmVhaztjYXNlXCJzdG9yZVwiOm50KGMsS2UsZix0LnRhcmdldCkuY3VycmVudD1lfWJyZWFrfWNhc2UnY29tcHV0ZSc6bGV0IGU9dS5kYXRhO2lmKGUuZm4pe1hlPSd3YXRjaCc9PT1vZShmLCdvcCcpLFllPWUucHVyZTtsZXQgdD1lLnNhZmU/KDAsZS5mbikodGUociksaS5zY29wZSxyKTpvdChpLGUuZm4scik7ZS5maWx0ZXI/cz0hdDpyLnZhbHVlPXQsWGU9cC5pc1dhdGNoLFllPXAuaXNQdXJlfX1sPWkuZmFpbHx8c31pZighbCl7bGV0IGU9dGUocik7dChmLm5leHQsKHQ9PntIZSgnY2hpbGQnLGMsdCxyLGUsYWUocikpfSkpO2xldCBuPWFlKHIpO2lmKG4pe29lKGYsJ25lZWRGeENvdW50ZXInKSYmSGUoJ2NoaWxkJyxjLG4uZnhDb3VudCxyLGUsbiksb2UoZiwnc3RvcmVDaGFuZ2UnKSYmSGUoJ2NoaWxkJyxjLG4uc3RvcmVDaGFuZ2UscixlLG4pLG9lKGYsJ3dhcm5TZXJpYWxpemUnKSYmSGUoJ2NoaWxkJyxjLG4ud2FyblNlcmlhbGl6ZU5vZGUscixlLG4pO2xldCBhPW4uYWRkaXRpb25hbExpbmtzW2YuaWRdO2EmJnQoYSwodD0+e0hlKCdjaGlsZCcsYyx0LHIsZSxuKX0pKX19fVFlPXAuaXNSb290LFplPXAuY3VycmVudFBhZ2UsS2U9YWUocCl9ZnVuY3Rpb24gaSh0LHI9XCJjb21iaW5lXCIpe2xldCBuPXIrJygnLGE9Jycsbz0wO3JldHVybiBlKHQsKGU9PntvPDI1JiYobnVsbCE9ZSYmKG4rPWEsbis9RShlKT9sZShlKS5mdWxsTmFtZTplLnRvU3RyaW5nKCkpLG8rPTEsYT0nLCAnKX0pKSxuKycpJ31mdW5jdGlvbiBsKGUsdCl7ZS5zaG9ydE5hbWU9dCxPYmplY3QuYXNzaWduKGxlKGUpLHModCxuZShlKSkpfWZ1bmN0aW9uIHMoZSx0KXtsZXQgcixuLGE9ZTtpZih0KXtsZXQgYT1sZSh0KTswPT09ZS5sZW5ndGg/KHI9YS5wYXRoLG49YS5mdWxsTmFtZSk6KHI9YS5wYXRoLmNvbmNhdChbZV0pLG49MD09PWEuZnVsbE5hbWUubGVuZ3RoP2U6YS5mdWxsTmFtZSsnLycrZSl9ZWxzZSByPTA9PT1lLmxlbmd0aD9bXTpbZV0sbj1lO3JldHVybntzaG9ydE5hbWU6YSxmdWxsTmFtZTpuLHBhdGg6cn19ZnVuY3Rpb24gZihlLHQpe2xldCByPXQ/ZTplWzBdO3dlKHIpO2xldCBuPXIub3IsYT1yLmFuZDtpZihhKXtsZXQgcj10P2E6YVswXTtpZihiZShyKSYmJ2FuZCdpbiByKXtsZXQgcj1mKGEsdCk7ZT1yWzBdLG49ey4uLm4sLi4uclsxXX19ZWxzZSBlPWF9cmV0dXJuW2Usbl19ZnVuY3Rpb24gdShlLC4uLnQpe2xldCByPXBlKCk7aWYocil7bGV0IG49ci5oYW5kbGVyc1tlXTtpZihuKXJldHVybiBuKHIsLi4udCl9fWZ1bmN0aW9uIGMoZSx0KXtsZXQgcj0oZSwuLi50KT0+KFEoIW9lKHIsJ2Rlcml2ZWQnKSwnY2FsbCBvZiBkZXJpdmVkIGV2ZW50JywnY3JlYXRlRXZlbnQnKSxRKCFZZSwndW5pdCBjYWxsIGZyb20gcHVyZSBmdW5jdGlvbicsJ29wZXJhdG9ycyBsaWtlIHNhbXBsZScpLFplPygoZSx0LHIsbik9PntsZXQgYT1aZSxvPW51bGw7aWYodClmb3Iobz1aZTtvJiZvLnRlbXBsYXRlIT09dDspbz1uZShvKTt0dChvKTtsZXQgaT1lLmNyZWF0ZShyLG4pO3JldHVybiB0dChhKSxpfSkocixuLGUsdCk6ci5jcmVhdGUoZSx0KSksbj1wZSgpO3JldHVybiBPYmplY3QuYXNzaWduKHIse2dyYXBoaXRlOmEoe21ldGE6eXQoXCJldmVudFwiLHIsZSx0KSxyZWdpb25hbDoxfSksY3JlYXRlOmU9PihvKHt0YXJnZXQ6cixwYXJhbXM6ZSxzY29wZTpLZX0pLGUpLHdhdGNoOmU9Pmd0KHIsZSksbWFwOmU9PmJ0KHIsUCxlLFtEZSgpXSksZmlsdGVyOmU9PmJ0KHIsXCJmaWx0ZXJcIixlLmZuP2U6ZS5mbixbRGUoTWUsMSldKSxmaWx0ZXJNYXA6ZT0+YnQociwnZmlsdGVyTWFwJyxlLFtEZSgpLE9lKChlPT4ha2UoZSkpLDEpXSkscHJlcGVuZChlKXtsZXQgdD1jKCcqIFxcdTIxOTIgJytyLnNob3J0TmFtZSx7cGFyZW50Om5lKHIpfSk7cmV0dXJuIHUoJ2V2ZW50UHJlcGVuZCcsWCh0KSkscHQodCxyLFtEZSgpXSwncHJlcGVuZCcsZSksaHQocix0KSx0fX0pfWZ1bmN0aW9uIGQoZSxuKXtsZXQgaT1QZShlKSxsPWMoe25hbWVkOid1cGRhdGVzJyxkZXJpdmVkOjF9KTt1KCdzdG9yZUJhc2UnLGkpO2xldCBzPWkuaWQsZj17c3Vic2NyaWJlcnM6bmV3IE1hcCx1cGRhdGVzOmwsZGVmYXVsdFN0YXRlOmUsc3RhdGVSZWY6aSxnZXRTdGF0ZSgpe2xldCBlLHQ9aTtpZihaZSl7bGV0IHQ9WmU7Zm9yKDt0JiYhdC5yZWdbc107KXQ9bmUodCk7dCYmKGU9dCl9cmV0dXJuIWUmJktlJiYoYXQoS2UsaSwxKSxlPUtlKSxlJiYodD1lLnJlZ1tzXSksX2UodCl9LHNldFN0YXRlOmU9Pm8oe3RhcmdldDpmLHBhcmFtczplLGRlZmVyOjEsc2NvcGU6S2V9KSxyZXNldDooLi4uZSk9Pih0KGUsKGU9PmYub24oZSwoKCk9PmYuZGVmYXVsdFN0YXRlKSkpKSxmKSxvbjooZSxyKT0+KHhlKGUsJy5vbicsJ2ZpcnN0IGFyZ3VtZW50JyksUSghb2UoZiwnZGVyaXZlZCcpLCcub24gaW4gZGVyaXZlZCBzdG9yZScsJ2NyZWF0ZVN0b3JlJyksdChBcnJheS5pc0FycmF5KGUpP2U6W2VdLChlPT57Zi5vZmYoZSkscmUoZikuc2V0KGUsZHQodnQoZSxmLCdvbicsamUscikpKX0pKSxmKSxvZmYoZSl7bGV0IHQ9cmUoZikuZ2V0KGUpO3JldHVybiB0JiYodCgpLHJlKGYpLmRlbGV0ZShlKSksZn0sbWFwKGUsdCl7bGV0IHIsbjtiZShlKSYmKHI9ZSxlPWUuZm4pLFEoa2UodCksJ3NlY29uZCBhcmd1bWVudCBvZiBzdG9yZS5tYXAnLCd1cGRhdGVGaWx0ZXInKTtsZXQgYT1mLmdldFN0YXRlKCk7cGUoKT9uPW51bGw6a2UoYSl8fChuPWUoYSx0KSk7bGV0IG89ZChuLHtuYW1lOmAke2Yuc2hvcnROYW1lfSBcXHUyMTkyICpgLGRlcml2ZWQ6MSxhbmQ6cn0pLGw9dnQoZixvLFAsJGUsZSk7cmV0dXJuIEVlKGVlKG8pLHt0eXBlOlAsZm46ZSxmcm9tOml9KSxlZShvKS5ub0luaXQ9MSx1KCdzdG9yZU1hcCcsaSxsKSxvfSx3YXRjaChlLHQpe2lmKCF0fHwhRShlKSl7bGV0IHQ9Z3QoZixlKTtyZXR1cm4gdSgnc3RvcmVXYXRjaCcsaSxlKXx8ZShmLmdldFN0YXRlKCkpLHR9cmV0dXJuIHIodmUodCksJ3NlY29uZCBhcmd1bWVudCBzaG91bGQgYmUgYSBmdW5jdGlvbicpLGUud2F0Y2goKGU9PnQoZi5nZXRTdGF0ZSgpLGUpKSl9fSxwPXl0KFwic3RvcmVcIixmLG4pLG09Zi5kZWZhdWx0Q29uZmlnLnVwZGF0ZUZpbHRlcjtmLmdyYXBoaXRlPWEoe3Njb3BlOntzdGF0ZTppLGZuOm19LG5vZGU6W09lKCgoZSx0LHIpPT4oci5zY29wZSYmIXIuc2NvcGUucmVnW2kuaWRdJiYoci5iPTEpLGUpKSksRmUoaSksT2UoKChlLHQse2E6cixiOm59KT0+IWtlKGUpJiYoZSE9PXJ8fG4pKSwxKSxtJiZEZSgkZSwxKSxxZSh7ZnJvbTpfLHRhcmdldDppfSldLGNoaWxkOmwsbWV0YTpwLHJlZ2lvbmFsOjF9KTtsZXQgZz1vZShmLCdkZXJpdmVkJyksaD0naWdub3JlJz09PW9lKGYsJ3NlcmlhbGl6ZScpLHk9b2UoZiwnc2lkJyk7cmV0dXJuIHkmJihofHxpZShmLCdzdG9yZUNoYW5nZScsMSksaS5zaWQ9eSkseXx8aHx8Z3x8aWUoZiwnd2FyblNlcmlhbGl6ZScsMSkscihnfHwha2UoZSksXCJjdXJyZW50IHN0YXRlIGNhbid0IGJlIHVuZGVmaW5lZCwgdXNlIG51bGwgaW5zdGVhZFwiKSxoZShmLFtsXSksZn1mdW5jdGlvbiBwKC4uLmUpe2xldCB0LG4sYTtbZSxhXT1mKGUpO2xldCBvLGksbCxzPWVbZS5sZW5ndGgtMV07aWYodmUocyk/KG49ZS5zbGljZSgwLC0xKSx0PXMpOm49ZSwxPT09bi5sZW5ndGgpe2xldCBlPW5bMF07TChlKXx8KG89ZSxpPTEpfWlmKCFpJiYobz1uLHQpKXtsPTE7bGV0IGU9dDt0PXQ9PmUoLi4udCl9cmV0dXJuIHIoYmUobyksJ3NoYXBlIHNob3VsZCBiZSBhbiBvYmplY3QnKSxrdChBcnJheS5pc0FycmF5KG8pLCFsLG8sYSx0KX1mdW5jdGlvbiBtKC4uLmUpe3JldHVybiBRKDAsJ2NyZWF0ZVN0b3JlT2JqZWN0JywnY29tYmluZScpLHAoLi4uZSl9ZnVuY3Rpb24gZygpe2xldCBlPXt9O3JldHVybiBlLnJlcT1uZXcgUHJvbWlzZSgoKHQscik9PntlLnJzPXQsZS5yaj1yfSkpLGUucmVxLmNhdGNoKCgoKT0+e30pKSxlfWZ1bmN0aW9uIGgoZSx0KXtsZXQgbj1jKHZlKGUpP3toYW5kbGVyOmV9OmUsdCksaT1YKG4pO2llKGksJ29wJyxuLmtpbmQ9XCJlZmZlY3RcIiksbi51c2U9ZT0+KHIodmUoZSksJy51c2UgYXJndW1lbnQgc2hvdWxkIGJlIGEgZnVuY3Rpb24nKSxtLnNjb3BlLmhhbmRsZXI9ZSxuKSxuLnVzZS5nZXRDdXJyZW50PSgpPT5tLnNjb3BlLmhhbmRsZXI7bGV0IGw9bi5maW5hbGx5PWMoe25hbWVkOidmaW5hbGx5JyxkZXJpdmVkOjF9KSxzPW4uZG9uZT1sLmZpbHRlck1hcCh7bmFtZWQ6J2RvbmUnLGZuKHtzdGF0dXM6ZSxwYXJhbXM6dCxyZXN1bHQ6cn0pe2lmKCdkb25lJz09PWUpcmV0dXJue3BhcmFtczp0LHJlc3VsdDpyfX19KSxmPW4uZmFpbD1sLmZpbHRlck1hcCh7bmFtZWQ6J2ZhaWwnLGZuKHtzdGF0dXM6ZSxwYXJhbXM6dCxlcnJvcjpyfSl7aWYoJ2ZhaWwnPT09ZSlyZXR1cm57cGFyYW1zOnQsZXJyb3I6cn19fSksdT1uLmRvbmVEYXRhPXMubWFwKHtuYW1lZDonZG9uZURhdGEnLGZuOih7cmVzdWx0OmV9KT0+ZX0pLHA9bi5mYWlsRGF0YT1mLm1hcCh7bmFtZWQ6J2ZhaWxEYXRhJyxmbjooe2Vycm9yOmV9KT0+ZX0pLG09YSh7c2NvcGU6e2hhbmRsZXJJZDpvZShpLCdzaWQnKSxoYW5kbGVyOm4uZGVmYXVsdENvbmZpZy5oYW5kbGVyfHwoKCk9PnIoMCxgbm8gaGFuZGxlciB1c2VkIGluICR7bi5nZXRUeXBlKCl9YCkpfSxub2RlOltPZSgoKGUsdCxyKT0+e2xldCBuPXQsYT1uLmhhbmRsZXI7aWYoYWUocikpe2xldCBlPWFlKHIpLmhhbmRsZXJzW24uaGFuZGxlcklkXTtlJiYoYT1lKX1yZXR1cm4gZS5oYW5kbGVyPWEsZX0pLDAsMSksT2UoKCh7cGFyYW1zOmUscmVxOnQsaGFuZGxlcjpyLGFyZ3M6bj1bZV19LGEsbyk9PntsZXQgaT1TdChlLHQsMSxsLG8pLHM9U3QoZSx0LDAsbCxvKSxbZix1XT13dChyLHMsbik7ZiYmKGJlKHUpJiZ2ZSh1LnRoZW4pP3UudGhlbihpLHMpOmkodSkpfSksMCwxKV0sbWV0YTp7b3A6J2Z4JyxmeDoncnVubmVyJ319KTtpLnNjb3BlLnJ1bm5lcj1tLEsoaS5zZXEsT2UoKChlLHtydW5uZXI6dH0scik9PntsZXQgbj1uZShyKT97cGFyYW1zOmUscmVxOntycyhlKXt9LHJqKGUpe319fTplO3JldHVybiBvKHt0YXJnZXQ6dCxwYXJhbXM6bixkZWZlcjoxLHNjb3BlOmFlKHIpfSksbi5wYXJhbXN9KSwwLDEpKSxuLmNyZWF0ZT1lPT57bGV0IHQ9ZygpLHI9e3BhcmFtczplLHJlcTp0fTtpZihLZSl7aWYoIVhlKXtsZXQgZT1LZTt0LnJlcS5maW5hbGx5KCgoKT0+e2V0KGUpfSkpLmNhdGNoKCgoKT0+e30pKX1vKHt0YXJnZXQ6bixwYXJhbXM6cixzY29wZTpLZX0pfWVsc2UgbyhuLHIpO3JldHVybiB0LnJlcX07bGV0IGg9bi5pbkZsaWdodD1kKDAse3NlcmlhbGl6ZTonaWdub3JlJ30pLm9uKG4sKGU9PmUrMSkpLm9uKGwsKGU9PmUtMSkpLm1hcCh7Zm46ZT0+ZSxuYW1lZDonaW5GbGlnaHQnfSk7aWUobCwnbmVlZEZ4Q291bnRlcicsJ2RlYycpLGllKG4sJ25lZWRGeENvdW50ZXInLDEpO2xldCB5PW4ucGVuZGluZz1oLm1hcCh7Zm46ZT0+ZT4wLG5hbWVkOidwZW5kaW5nJ30pO3JldHVybiBoZShuLFtsLHMsZix1LHAseSxoXSksbn1mdW5jdGlvbiB5KGUpe2xldCB0O1tlLHRdPWYoZSwxKTtsZXR7c291cmNlOnIsZWZmZWN0Om4sbWFwUGFyYW1zOmF9PWUsaT1oKGUsdCk7aWUoaSwnYXR0YWNoZWQnLDEpO2xldCBsLHtydW5uZXI6dX09WChpKS5zY29wZSxjPU9lKCgoZSx0LG4pPT57bGV0IGwse3BhcmFtczpzLHJlcTpmLGhhbmRsZXI6dX09ZSxjPWkuZmluYWxseSxkPVN0KHMsZiwwLGMsbikscD1uLmEsbT1CKHUpLGc9MTtpZihhP1tnLGxdPXd0KGEsZCxbcyxwXSk6bD1yJiZtP3A6cyxnKXtpZighbSlyZXR1cm4gZS5hcmdzPVtwLGxdLDE7byh7dGFyZ2V0OnUscGFyYW1zOntwYXJhbXM6bCxyZXE6e3JzOlN0KHMsZiwxLGMsbikscmo6ZH19LHBhZ2U6bi5wYWdlLGRlZmVyOjF9KX19KSwxLDEpO2lmKHIpe2xldCBlO0wocik/KGU9cixoZShlLFtpXSkpOihlPXAociksaGUoaSxbZV0pKSxsPVtGZShlZShlKSksY119ZWxzZSBsPVtjXTt1LnNlcS5zcGxpY2UoMSwwLC4uLmwpLGkudXNlKG4pO2xldCBkPW5lKG4pO3JldHVybiBkJiYoT2JqZWN0LmFzc2lnbihsZShpKSxzKGkuc2hvcnROYW1lLGQpKSxpLmRlZmF1bHRDb25maWcucGFyZW50PWQpLGh0KG4saSxcImVmZmVjdFwiKSxpfWZ1bmN0aW9uIGIoLi4udCl7bGV0W1tyLG5dLGFdPWYodCksbz17fTtyZXR1cm4gZShuLCgoZSx0KT0+e2xldCBuPW9bdF09Yyh0LHtwYXJlbnQ6bmUociksY29uZmlnOmF9KTtyLm9uKG4sZSksaHQocixuKX0pKSxvfWZ1bmN0aW9uIHYocixuKXtsZXQgaT1hKHtmYW1pbHk6e3R5cGU6XCJkb21haW5cIn0scmVnaW9uYWw6MX0pLGw9e2hpc3Rvcnk6e30sZ3JhcGhpdGU6aSxob29rczp7fX07aS5tZXRhPXl0KFwiZG9tYWluXCIsbCxyLG4pLGUoe0V2ZW50OmMsRWZmZWN0OmgsU3RvcmU6ZCxEb21haW46dn0sKChlLHIpPT57bGV0IG49ci50b0xvd2VyQ2FzZSgpLGE9Yyh7bmFtZWQ6YG9uJHtyfWB9KTtsLmhvb2tzW25dPWE7bGV0IGk9bmV3IFNldDtsLmhpc3RvcnlbYCR7bn1zYF09aSxhLmNyZWF0ZT1lPT4obyhhLGUpLGUpLEsoWChhKS5zZXEsT2UoKChlLHQscik9PihyLnNjb3BlPW51bGwsZSkpKSksYS53YXRjaCgoZT0+e2hlKGwsW2VdKSxpLmFkZChlKSxlLm93bmVyU2V0fHwoZS5vd25lclNldD1pKSxuZShlKXx8KGUucGFyZW50PWwpfSkpLGhlKGwsW2FdKSxsW2BvbkNyZWF0ZSR7cn1gXT1lPT4odChpLGUpLGEud2F0Y2goZSkpLGxbYGNyZWF0ZSR7cn1gXT1sW25dPSh0LHIpPT5hKGUodCx7cGFyZW50Omwsb3I6cn0pKX0pKTtsZXQgcz1uZShsKTtyZXR1cm4gcyYmZShsLmhvb2tzLCgoZSx0KT0+cHQoZSxzLmhvb2tzW3RdKSkpLGx9ZnVuY3Rpb24gayhlKXt3ZShlKTtsZXQgdD1SIGluIGU/ZVtSXSgpOmU7cih0LnN1YnNjcmliZSwnZXhwZWN0IG9ic2VydmFibGUgdG8gaGF2ZSAuc3Vic2NyaWJlJyk7bGV0IG49YygpLGE9ZHQobik7cmV0dXJuIHQuc3Vic2NyaWJlKHtuZXh0Om4sZXJyb3I6YSxjb21wbGV0ZTphfSksbn1mdW5jdGlvbiB3KGUsdCl7eGUoZSwnbWVyZ2UnLCdmaXJzdCBhcmd1bWVudCcpO2xldCByPWMoe25hbWU6aShlLCdtZXJnZScpLGRlcml2ZWQ6MSxhbmQ6dH0pO3JldHVybiBwdChlLHIsW10sJ21lcmdlJykscn1mdW5jdGlvbiBTKGUsbil7bGV0IGE9MDtyZXR1cm4gdChDdCwodD0+e3QgaW4gZSYmKHIobnVsbCE9ZVt0XSwkdChuLHQpKSxhPTEpfSkpLGF9ZnVuY3Rpb24geCguLi5lKXtsZXQgdCxyLG4sYSxbW28saSxsXSxzXT1mKGUpLHU9MTtyZXR1cm4ga2UoaSkmJmJlKG8pJiZTKG8sXCJzYW1wbGVcIikmJihpPW8uY2xvY2ssbD1vLmZuLHU9IW8uZ3JlZWR5LGE9by5maWx0ZXIsdD1vLnRhcmdldCxyPW8ubmFtZSxuPW8uc2lkLG89by5zb3VyY2UpLGp0KFwic2FtcGxlXCIsaSxvLGEsdCxsLHIscyx1LDEsMCxuKX1mdW5jdGlvbiBDKC4uLmUpe2xldFtbdCxyXSxuXT1mKGUpO3JldHVybiByfHwocj10LHQ9ci5zb3VyY2UpLFMociwnZ3VhcmQnKSxqdCgnZ3VhcmQnLHIuY2xvY2ssdCxyLmZpbHRlcixyLnRhcmdldCxudWxsLHIubmFtZSxuLCFyLmdyZWVkeSwwLDEpfWZ1bmN0aW9uICQodCxyLG4pe2lmKEwodCkpcmV0dXJuIFEoMCwncmVzdG9yZSgkc3RvcmUpJyksdDtpZihUKHQpfHxCKHQpKXtsZXQgZT1uZSh0KSxhPWQocix7cGFyZW50OmUsbmFtZTp0LnNob3J0TmFtZSxhbmQ6bn0pO3JldHVybiBwdChCKHQpP3QuZG9uZURhdGE6dCxhKSxlJiZlLmhvb2tzLnN0b3JlKGEpLGF9bGV0IGE9QXJyYXkuaXNBcnJheSh0KT9bXTp7fTtyZXR1cm4gZSh0LCgoZSx0KT0+YVt0XT1MKGUpP2U6ZChlLHtuYW1lOnR9KSkpLGF9ZnVuY3Rpb24gaiguLi50KXtsZXQgbixvLGk9J3NwbGl0JyxbW2wsc10sZF09Zih0KSxwPSFzO3AmJihuPWwuY2FzZXMscz1sLm1hdGNoLG89bC5jbG9jayxsPWwuc291cmNlKTtsZXQgbT1MKHMpLGc9IUUocykmJnZlKHMpLGg9IW0mJiFnJiZiZShzKTtufHwobj17fSkscD9lKG4sKChlLHQpPT5DZShpLGUsYGNhc2VzLiR7dH1gKSkpOihyKGgsJ21hdGNoIHNob3VsZCBiZSBhbiBvYmplY3QnKSxlKHMsKChlLHQpPT5uW3RdPWMoe2Rlcml2ZWQ6MSxhbmQ6ZH0pKSksbi5fXz1jKHtkZXJpdmVkOjEsYW5kOmR9KSk7bGV0IHksYj1uZXcgU2V0KFtdLmNvbmNhdChsLG98fFtdLE9iamVjdC52YWx1ZXMobikpKSx2PU9iamVjdC5rZXlzKG18fGc/bjpzKTtpZihtfHxnKW0mJmIuYWRkKHMpLHk9W20mJkZlKGVlKHMpLDAsMSksTmUoe3NhZmU6bSxmaWx0ZXI6MSxwdXJlOiFtLGZuKGUsdCxyKXtsZXQgbj1TdHJpbmcobT9yLmE6cyhlKSk7SXQodCxHKHYsbik/bjonX18nLGUscil9fSldO2Vsc2UgaWYoaCl7bGV0IHQ9UGUoe30pO3QudHlwZT0nc2hhcGUnO2xldCByLG49W107ZShzLCgoZSxhKT0+e2lmKEUoZSkpe3I9MSxLKG4sYSksYi5hZGQoZSk7bGV0IG89cHQoZSxbXSxbRmUodCksT2UoKChlLHQse2E6cn0pPT5yW2FdPWUpKV0pO2lmKEwoZSkpe3QuY3VycmVudFthXT1lLmdldFN0YXRlKCk7bGV0IHI9ZWUoZSk7RWUodCx7ZnJvbTpyLGZpZWxkOmEsdHlwZTonZmllbGQnfSksdSgnc3BsaXRNYXRjaFN0b3JlJyxyLG8pfX19KSksciYmdSgnc3BsaXRCYXNlJyx0KSx5PVtyJiZGZSh0LDAsMSksRGUoKChlLHQscik9Pntmb3IobGV0IGE9MDthPHYubGVuZ3RoO2ErKyl7bGV0IG89dlthXTtpZihHKG4sbyk/ci5hW29dOnNbb10oZSkpcmV0dXJuIHZvaWQgSXQodCxvLGUscil9SXQodCwnX18nLGUscil9KSwxKV19ZWxzZSByKDAsJ2V4cGVjdCBtYXRjaCB0byBiZSB1bml0LCBmdW5jdGlvbiBvciBvYmplY3QnKTtsZXQgaz1hKHttZXRhOntvcDppfSxwYXJlbnQ6bz9bXTpsLHNjb3BlOm4sbm9kZTp5LGZhbWlseTp7b3duZXJzOkFycmF5LmZyb20oYil9LHJlZ2lvbmFsOjF9KTtpZihvJiZqdChpLG8sbCxudWxsLGssbnVsbCxpLGQsMCwwLDApLCFwKXJldHVybiBufWZ1bmN0aW9uIE0oZSx7c2NvcGU6dCxwYXJhbXM6cn0pe2lmKCFFKGUpKXJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ2ZpcnN0IGFyZ3VtZW50IHNob3VsZCBiZSB1bml0JykpO2lmKCFCKGUpJiYhVChlKSYmIUwoZSkpcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignZmlyc3QgYXJndW1lbnQgYWNjZXB0cyBvbmx5IGVmZmVjdHMsIGV2ZW50cyBhbmQgc3RvcmVzJykpO2xldCBuPWcoKTtuLnBhcmVudEZvcms9S2U7bGV0e2Z4Q291bnQ6YX09dDtLKGEuc2NvcGUuZGVmZXJzLG4pO2xldCBpPVtlXSxsPVtdO3JldHVybiBLKGwsQihlKT97cGFyYW1zOnIscmVxOntycyhlKXtuLnZhbHVlPXtzdGF0dXM6J2RvbmUnLHZhbHVlOmV9fSxyaihlKXtuLnZhbHVlPXtzdGF0dXM6J2ZhaWwnLHZhbHVlOmV9fX19OnIpLEsoaSxhKSxLKGwsbnVsbCksbyh7dGFyZ2V0OmkscGFyYW1zOmwsc2NvcGU6dH0pLG4ucmVxfWZ1bmN0aW9uIEEoZSxyKXtsZXQgbj1bXTsoZnVuY3Rpb24gZShhKXtHKG4sYSl8fChLKG4sYSksXCJzdG9yZVwiPT09b2UoYSwnb3AnKSYmb2UoYSwnc2lkJykmJnIoYSxvZShhLCdzaWQnKSksdChhLm5leHQsZSksdChZKGEpLGUpLHQoWihhKSxlKSl9KShlKX1mdW5jdGlvbiBJKGUsbil7aWYoQXJyYXkuaXNBcnJheShlKSYmKGU9bmV3IE1hcChlKSksZSBpbnN0YW5jZW9mIE1hcCl7bGV0IGE9e307cmV0dXJuIHQoZSwoKGUsdCk9PntyKEUodCksJ01hcCBrZXkgc2hvdWxkIGJlIGEgdW5pdCcpLG4mJm4odCxlKSxyKHQuc2lkLCd1bml0IHNob3VsZCBoYXZlIGEgc2lkJykscighKHQuc2lkIGluIGEpLCdkdXBsaWNhdGUgc2lkIGZvdW5kJyksYVt0LnNpZF09ZX0pKSxhfXJldHVybiBlfWZ1bmN0aW9uIHEoZSxuKXtsZXQgbyxpPWU7VyhlKSYmKG89ZSxpPW4pO2xldCBsPShlPT57bGV0IHI9YSh7c2NvcGU6e2RlZmVyczpbXSxpbkZsaWdodDowLGZ4SUQ6MH0sbm9kZTpbT2UoKChlLHQscik9PntuZShyKT8nZGVjJz09PW9lKG5lKHIpLm5vZGUsJ25lZWRGeENvdW50ZXInKT90LmluRmxpZ2h0LT0xOih0LmluRmxpZ2h0Kz0xLHQuZnhJRCs9MSk6dC5meElEKz0xfSkpLE5lKHtwcmlvcml0eTpcInNhbXBsZXJcIixiYXRjaDoxfSksT2UoKChlLHIpPT57bGV0e2RlZmVyczpuLGZ4SUQ6YX09cjtyLmluRmxpZ2h0PjB8fDA9PT1uLmxlbmd0aHx8UHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKCk9PntyLmZ4SUQ9PT1hJiZ0KG4uc3BsaWNlKDAsbi5sZW5ndGgpLChlPT57ZXQoZS5wYXJlbnRGb3JrKSxlLnJzKGUudmFsdWUpfSkpfSkpfSksMCwxKV19KSxuPWEoe25vZGU6W09lKCgoZSx0LHIpPT57bGV0IG49bmUocik7aWYobil7bGV0IHQ9bi5ub2RlO2lmKCFvZSh0LCdpc0NvbWJpbmUnKXx8bmUobikmJidjb21iaW5lJyE9PW9lKG5lKG4pLm5vZGUsJ29wJykpe2xldCBuPWFlKHIpLGE9dC5zY29wZS5zdGF0ZS5pZCxvPW9lKHQsJ3NpZCcpO24uc2lkSWRNYXBbb109YSxuLnNpZFZhbHVlc01hcFtvXT1lfX19KSldfSksbz1hKHtub2RlOltPZSgoKGUsdCxyKT0+e2xldCBuPWFlKHIpO2lmKG4pe2xldCBlPW5lKHIpO2UmJighb2UoZS5ub2RlLCdpc0NvbWJpbmUnKXx8bmUoZSkmJidjb21iaW5lJyE9PW9lKG5lKGUpLm5vZGUsJ29wJykpJiYobi53YXJuU2VyaWFsaXplPTEpfX0pKV19KSxpPXtjbG9uZU9mOmUscmVnOnt9LHNpZFZhbHVlc01hcDp7fSxzaWRJZE1hcDp7fSxnZXRTdGF0ZShlKXtpZignY3VycmVudCdpbiBlKXJldHVybiBudChaZSxpLG51bGwsZSkuY3VycmVudDtsZXQgdD1YKGUpO3JldHVybiBudChaZSxpLHQsdC5zY29wZS5zdGF0ZSwxKS5jdXJyZW50fSxraW5kOlwic2NvcGVcIixncmFwaGl0ZTphKHtmYW1pbHk6e3R5cGU6XCJkb21haW5cIixsaW5rczpbcixuLG9dfSxtZXRhOnt1bml0Oidmb3JrJ30sc2NvcGU6e2ZvcmtJbkZsaWdodENvdW50ZXI6cn19KSxhZGRpdGlvbmFsTGlua3M6e30saGFuZGxlcnM6e30sZnhDb3VudDpyLHN0b3JlQ2hhbmdlOm4sd2FyblNlcmlhbGl6ZU5vZGU6b307cmV0dXJuIGl9KShvKTtpZihpKXtpZihpLnZhbHVlcyl7bGV0IGU9SShpLnZhbHVlcywoZT0+cihMKGUpLCdWYWx1ZXMgbWFwIGNhbiBjb250YWluIG9ubHkgc3RvcmVzIGFzIGtleXMnKSkpO09iamVjdC5hc3NpZ24obC5zaWRWYWx1ZXNNYXAsZSl9aS5oYW5kbGVycyYmKGwuaGFuZGxlcnM9SShpLmhhbmRsZXJzLChlPT5yKEIoZSksXCJIYW5kbGVycyBtYXAgY2FuIGNvbnRhaW4gb25seSBlZmZlY3RzIGFzIGtleXNcIikpKSl9cmV0dXJuIGx9ZnVuY3Rpb24gTihlLHt2YWx1ZXM6dH0pe3IoYmUodCksJ3ZhbHVlcyBwcm9wZXJ0eSBzaG91bGQgYmUgYW4gb2JqZWN0Jyk7bGV0IG4sYSxpLGw9SSh0KSxzPU9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGwpLGY9W10sdT1bXTtIKGUpPyhuPWUsaT0xLHIobi5jbG9uZU9mLCdzY29wZSBzaG91bGQgYmUgY3JlYXRlZCBmcm9tIGRvbWFpbicpLGE9WChuLmNsb25lT2YpKTpXKGUpP2E9WChlKTpyKDAsJ2ZpcnN0IGFyZ3VtZW50IG9mIGh5ZHJhdGUgc2hvdWxkIGJlIGRvbWFpbiBvciBzY29wZScpLEEoYSwoKGUsdCk9PntHKHMsdCkmJihLKGYsZSksSyh1LGxbdF0pKX0pKSxvKHt0YXJnZXQ6ZixwYXJhbXM6dSxzY29wZTpufSksaSYmT2JqZWN0LmFzc2lnbihuLnNpZFZhbHVlc01hcCxsKX1mdW5jdGlvbiB6KGUse3Njb3BlOnR9PXt9KXtyKHR8fEtlLCdzY29wZUJpbmQgY2Fubm90IGJlIGNhbGxlZCBvdXRzaWRlIG9mIGZvcmtlZCAud2F0Y2gnKTtsZXQgbj10fHxLZTtyZXR1cm4gQihlKT90PT57bGV0IHI9ZygpO3JldHVybiBvKHt0YXJnZXQ6ZSxwYXJhbXM6e3BhcmFtczp0LHJlcTpyfSxzY29wZTpufSksci5yZXF9OnQ9PihvKHt0YXJnZXQ6ZSxwYXJhbXM6dCxzY29wZTpufSksdCl9ZnVuY3Rpb24gTyh0LG49e30pe3Qud2FyblNlcmlhbGl6ZSYmY29uc29sZS5lcnJvcignVGhlcmUgaXMgYSBzdG9yZSB3aXRob3V0IHNpZCBpbiB0aGlzIHNjb3BlLCBpdHMgdmFsdWUgaXMgb21pdHRlZCcpO2xldCBhPW4uaWdub3JlP24uaWdub3JlLm1hcCgoKHtzaWQ6ZX0pPT5lKSk6W10sbz17fTtyZXR1cm4gZSh0LnNpZFZhbHVlc01hcCwoKGUscik9PntpZihHKGEscikpcmV0dXJuO2xldCBuPXQuc2lkSWRNYXBbcl07b1tyXT1uJiZuIGluIHQucmVnP3QucmVnW25dLmN1cnJlbnQ6ZX0pKSwnb25seUNoYW5nZXMnaW4gbiYmIW4ub25seUNoYW5nZXMmJihyKHQuY2xvbmVPZiwnc2NvcGUgc2hvdWxkIGJlIGNyZWF0ZWQgZnJvbSBkb21haW4nKSxBKFgodC5jbG9uZU9mKSwoKGUscik9PntyIGluIG98fEcoYSxyKXx8b2UoZSwnaXNDb21iaW5lJyl8fCdpZ25vcmUnPT09b2UoZSwnc2VyaWFsaXplJyl8fChvW3JdPXQuZ2V0U3RhdGUoZSkpfSkpKSxvfWZ1bmN0aW9uIEYoe3VuaXQ6ZSxmbjp0LHNjb3BlOnJ9KXtsZXQgbj1bUmUucnVuKHtmbjplPT50KGUpfSldO2lmKHIpe2xldCB0PWEoe25vZGU6bn0pLG89ZS5ncmFwaGl0ZS5pZCxpPXIuYWRkaXRpb25hbExpbmtzLGw9aVtvXXx8W107cmV0dXJuIGlbb109bCxsLnB1c2godCksRCgoKCk9PntsZXQgZT1sLmluZGV4T2YodCk7LTEhPT1lJiZsLnNwbGljZShlLDEpLGN0KHQpfSkpfXtsZXQgdD1hKHtub2RlOm4scGFyZW50OltlXSxmYW1pbHk6e293bmVyczplfX0pO3JldHVybiBEKCgoKT0+e2N0KHQpfSkpfX1mdW5jdGlvbiBEKGUpe2xldCB0PSgpPT5lKCk7cmV0dXJuIHQudW5zdWJzY3JpYmU9KCk9PmUoKSx0fWxldCBSPSd1bmRlZmluZWQnIT10eXBlb2YgU3ltYm9sJiZTeW1ib2wub2JzZXJ2YWJsZXx8J0BAb2JzZXJ2YWJsZScsUD0nbWFwJyxfPSdzdGFjaycsRT1lPT4odmUoZSl8fGJlKGUpKSYmJ2tpbmQnaW4gZTtjb25zdCBWPWU9PnQ9PkUodCkmJnQua2luZD09PWU7bGV0IEw9VihcInN0b3JlXCIpLFQ9VihcImV2ZW50XCIpLEI9VihcImVmZmVjdFwiKSxXPVYoXCJkb21haW5cIiksSD1WKFwic2NvcGVcIik7dmFyIFU9e19fcHJvdG9fXzpudWxsLHVuaXQ6RSxzdG9yZTpMLGV2ZW50OlQsZWZmZWN0OkIsZG9tYWluOlcsc2NvcGU6SH07bGV0IEc9KGUsdCk9PmUuaW5jbHVkZXModCksSj0oZSx0KT0+e2xldCByPWUuaW5kZXhPZih0KTstMSE9PXImJmUuc3BsaWNlKHIsMSl9LEs9KGUsdCk9PmUucHVzaCh0KSxRPShlLHQscik9PiFlJiZjb25zb2xlLmVycm9yKGAke3R9IGlzIGRlcHJlY2F0ZWQke3I/YCwgdXNlICR7cn0gaW5zdGVhZGA6Jyd9YCksWD1lPT5lLmdyYXBoaXRlfHxlLFk9ZT0+ZS5mYW1pbHkub3duZXJzLFo9ZT0+ZS5mYW1pbHkubGlua3MsZWU9ZT0+ZS5zdGF0ZVJlZix0ZT1lPT5lLnZhbHVlLHJlPWU9PmUuc3Vic2NyaWJlcnMsbmU9ZT0+ZS5wYXJlbnQsYWU9ZT0+ZS5zY29wZSxvZT0oZSx0KT0+WChlKS5tZXRhW3RdLGllPShlLHQscik9PlgoZSkubWV0YVt0XT1yLGxlPWU9PmUuY29tcG9zaXRlTmFtZTtjb25zdCBzZT0oKT0+e2xldCBlPTA7cmV0dXJuKCk9PlwiXCIrICsrZX07bGV0IGZlPXNlKCksdWU9c2UoKSxjZT1zZSgpLGRlPW51bGwscGU9KCk9PmRlJiZkZS50ZW1wbGF0ZSxtZT1lPT4oZSYmZGUmJmRlLnNpZFJvb3QmJihlPWAke2RlLnNpZFJvb3R9fCR7ZX1gKSxlKSxnZT0oe3NpZDplLG5hbWU6dCxsb2M6cixtZXRob2Q6byxmbjppfSk9Pm4oYSh7bWV0YTp7c2lkUm9vdDptZShlKSxuYW1lOnQsbG9jOnIsbWV0aG9kOm99fSksaSksaGU9KGUscik9PntsZXQgbj1YKGUpO3QociwoZT0+e2xldCB0PVgoZSk7XCJkb21haW5cIiE9PW4uZmFtaWx5LnR5cGUmJih0LmZhbWlseS50eXBlPVwiY3Jvc3NsaW5rXCIpLEsoWSh0KSxuKSxLKFoobiksdCl9KSl9LHllPShlPVtdKT0+KEFycmF5LmlzQXJyYXkoZSk/ZTpbZV0pLmZsYXQoKS5tYXAoWCksYmU9ZT0+J29iamVjdCc9PXR5cGVvZiBlJiZudWxsIT09ZSx2ZT1lPT4nZnVuY3Rpb24nPT10eXBlb2YgZSxrZT1lPT52b2lkIDA9PT1lLHdlPWU9PnIoYmUoZSl8fHZlKGUpLCdleHBlY3QgZmlyc3QgYXJndW1lbnQgYmUgYW4gb2JqZWN0Jyk7Y29uc3QgU2U9KGUsdCxuLGEpPT5yKCEoIWJlKGUpJiYhdmUoZSl8fCEoJ2ZhbWlseSdpbiBlKSYmISgnZ3JhcGhpdGUnaW4gZSkpLGAke3R9OiBleHBlY3QgJHtufSB0byBiZSBhIHVuaXQgKHN0b3JlLCBldmVudCBvciBlZmZlY3QpJHthfWApO2xldCB4ZT0oZSxyLG4pPT57QXJyYXkuaXNBcnJheShlKT90KGUsKChlLHQpPT5TZShlLHIsYCR7dH0gaXRlbSBvZiAke259YCwnJykpKTpTZShlLHIsbiwnIG9yIGFycmF5IG9mIHVuaXRzJyl9LENlPShlLHIsbj1cInRhcmdldFwiKT0+dCh5ZShyKSwodD0+USghb2UodCwnZGVyaXZlZCcpLGAke2V9OiBkZXJpdmVkIHVuaXQgaW4gXCIke259XCJgLFwiY3JlYXRlRXZlbnQvY3JlYXRlU3RvcmVcIikpKSwkZT0oZSx7Zm46dH0se2E6cn0pPT50KGUsciksamU9KGUse2ZuOnR9LHthOnJ9KT0+dChyLGUpLE1lPShlLHtmbjp0fSk9PnQoZSk7Y29uc3QgQWU9KGUsdCxyLG4pPT57bGV0IGE9e2lkOnVlKCksdHlwZTplLGRhdGE6dH07cmV0dXJuIHImJihhLm9yZGVyPXtwcmlvcml0eTpyfSxuJiYoYS5vcmRlci5iYXJyaWVySUQ9KytJZSkpLGF9O2xldCBJZT0wLHFlPSh7ZnJvbTplPVwic3RvcmVcIixzdG9yZTp0LHRhcmdldDpyLHRvOm49KHI/XCJzdG9yZVwiOl8pLGJhdGNoOmEscHJpb3JpdHk6b30pPT5BZSgnbW92Jyx7ZnJvbTplLHN0b3JlOnQsdG86bix0YXJnZXQ6cn0sbyxhKSxOZT0oe2ZuOmUsYmF0Y2g6dCxwcmlvcml0eTpyLHNhZmU6bj0wLGZpbHRlcjphPTAscHVyZTpvPTB9KT0+QWUoJ2NvbXB1dGUnLHtmbjplLHNhZmU6bixmaWx0ZXI6YSxwdXJlOm99LHIsdCksemU9KHtmbjplfSk9Pk5lKHtmbjplLHByaW9yaXR5OlwiZWZmZWN0XCJ9KSxPZT0oZSx0LHIpPT5OZSh7Zm46ZSxzYWZlOjEsZmlsdGVyOnQscHJpb3JpdHk6ciYmXCJlZmZlY3RcIn0pLEZlPShlLHQscik9PnFlKHtzdG9yZTplLHRvOnQ/XzpcImFcIixwcmlvcml0eTpyJiZcInNhbXBsZXJcIixiYXRjaDoxfSksRGU9KGU9TWUsdCk9Pk5lKHtmbjplLHB1cmU6MSxmaWx0ZXI6dH0pLFJlPXttb3Y6cWUsY29tcHV0ZTpOZSxmaWx0ZXI6KHtmbjplLHB1cmU6dH0pPT5OZSh7Zm46ZSxmaWx0ZXI6MSxwdXJlOnR9KSxydW46emV9LFBlPWU9Pih7aWQ6dWUoKSxjdXJyZW50OmV9KSxfZT0oe2N1cnJlbnQ6ZX0pPT5lLEVlPShlLHQpPT57ZS5iZWZvcmV8fChlLmJlZm9yZT1bXSksSyhlLmJlZm9yZSx0KX0sVmU9bnVsbDtjb25zdCBMZT0oZSx0KT0+e2lmKCFlKXJldHVybiB0O2lmKCF0KXJldHVybiBlO2xldCByO3JldHVybihlLnYudHlwZT09PXQudi50eXBlJiZlLnYuaWQ+dC52LmlkfHxHZShlLnYudHlwZSk+R2UodC52LnR5cGUpKSYmKHI9ZSxlPXQsdD1yKSxyPUxlKGUucix0KSxlLnI9ZS5sLGUubD1yLGV9LFRlPVtdO2xldCBCZT0wO2Zvcig7QmU8NjspSyhUZSx7Zmlyc3Q6bnVsbCxsYXN0Om51bGwsc2l6ZTowfSksQmUrPTE7Y29uc3QgV2U9KCk9Pntmb3IobGV0IGU9MDtlPDY7ZSsrKXtsZXQgdD1UZVtlXTtpZih0LnNpemU+MCl7aWYoMz09PWV8fDQ9PT1lKXt0LnNpemUtPTE7bGV0IGU9VmUudjtyZXR1cm4gVmU9TGUoVmUubCxWZS5yKSxlfTE9PT10LnNpemUmJih0Lmxhc3Q9bnVsbCk7bGV0IHI9dC5maXJzdDtyZXR1cm4gdC5maXJzdD1yLnIsdC5zaXplLT0xLHIudn19fSxIZT0oZSx0LHIsbixhLG8pPT5VZSgwLHthOm51bGwsYjpudWxsLG5vZGU6cixwYXJlbnQ6bix2YWx1ZTphLHBhZ2U6dCxzY29wZTpvfSxlKSxVZT0oZSx0LHIsbj0wKT0+e2xldCBhPUdlKHIpLG89VGVbYV0saT17djp7aWR4OmUsc3RhY2s6dCx0eXBlOnIsaWQ6bn0sbDpudWxsLHI6bnVsbH07Mz09PWF8fDQ9PT1hP1ZlPUxlKFZlLGkpOigwPT09by5zaXplP28uZmlyc3Q9aTpvLmxhc3Qucj1pLG8ubGFzdD1pKSxvLnNpemUrPTF9LEdlPWU9Pntzd2l0Y2goZSl7Y2FzZSdjaGlsZCc6cmV0dXJuIDA7Y2FzZSdwdXJlJzpyZXR1cm4gMTtjYXNlJ3JlYWQnOnJldHVybiAyO2Nhc2VcImJhcnJpZXJcIjpyZXR1cm4gMztjYXNlXCJzYW1wbGVyXCI6cmV0dXJuIDQ7Y2FzZVwiZWZmZWN0XCI6cmV0dXJuIDU7ZGVmYXVsdDpyZXR1cm4tMX19LEplPW5ldyBTZXQ7bGV0IEtlLFFlPTEsWGU9MCxZZT0wLFplPW51bGwsZXQ9ZT0+e0tlPWV9LHR0PWU9PntaZT1lfTtjb25zdCBydD0oZSx0KT0+e2lmKGUpe2Zvcig7ZSYmIWUucmVnW3RdOyllPW5lKGUpO2lmKGUpcmV0dXJuIGV9cmV0dXJuIG51bGx9O2xldCBudD0oZSx0LHIsbixhKT0+e2xldCBvPXJ0KGUsbi5pZCk7cmV0dXJuIG8/by5yZWdbbi5pZF06dD8oYXQodCxuLGEpLHQucmVnW24uaWRdKTpufSxhdD0oZSxyLG4sYSxvKT0+e2xldCBpPWUucmVnLGw9ci5zaWQ7aWYoaVtyLmlkXSlyZXR1cm47bGV0IHM9e2lkOnIuaWQsY3VycmVudDpyLmN1cnJlbnR9O2lmKGwmJmwgaW4gZS5zaWRWYWx1ZXNNYXAmJiEobCBpbiBlLnNpZElkTWFwKSlzLmN1cnJlbnQ9ZS5zaWRWYWx1ZXNNYXBbbF07ZWxzZSBpZihyLmJlZm9yZSYmIW8pe2xldCBvPTAsbD1ufHwhci5ub0luaXR8fGE7dChyLmJlZm9yZSwodD0+e3N3aXRjaCh0LnR5cGUpe2Nhc2UgUDp7bGV0IHI9dC5mcm9tO2lmKHJ8fHQuZm4pe3ImJmF0KGUscixuLGEpO2xldCBvPXImJmlbci5pZF0uY3VycmVudDtsJiYocy5jdXJyZW50PXQuZm4/dC5mbihvKTpvKX1icmVha31jYXNlJ2ZpZWxkJzpvfHwobz0xLHMuY3VycmVudD1BcnJheS5pc0FycmF5KHMuY3VycmVudCk/Wy4uLnMuY3VycmVudF06ey4uLnMuY3VycmVudH0pLGF0KGUsdC5mcm9tLG4sYSksbCYmKHMuY3VycmVudFt0LmZpZWxkXT1pW2lbdC5mcm9tLmlkXS5pZF0uY3VycmVudCl9fSkpfWwmJihlLnNpZElkTWFwW2xdPXIuaWQpLGlbci5pZF09c307Y29uc3Qgb3Q9KGUsdCxyKT0+e3RyeXtyZXR1cm4gdCh0ZShyKSxlLnNjb3BlLHIpfWNhdGNoKHQpe2NvbnNvbGUuZXJyb3IodCksZS5mYWlsPTF9fTtsZXQgbHQ9KHQscj17fSk9PihiZSh0KSYmKGx0KHQub3IsciksZSh0LCgoZSx0KT0+e2tlKGUpfHwnb3InPT09dHx8J2FuZCc9PT10fHwoclt0XT1lKX0pKSxsdCh0LmFuZCxyKSkscik7Y29uc3Qgc3Q9KGUsdCk9PntKKGUubmV4dCx0KSxKKFkoZSksdCksSihaKGUpLHQpfSxmdD0oZSx0LHIpPT57bGV0IG47ZS5uZXh0Lmxlbmd0aD0wLGUuc2VxLmxlbmd0aD0wLGUuc2NvcGU9bnVsbDtsZXQgYT1aKGUpO2Zvcig7bj1hLnBvcCgpOylzdChuLGUpLCh0fHxyJiYnc2FtcGxlJyE9PW9lKGUsJ29wJyl8fFwiY3Jvc3NsaW5rXCI9PT1uLmZhbWlseS50eXBlKSYmZnQobix0LCdvbichPT1vZShuLCdvcCcpJiZyKTtmb3IoYT1ZKGUpO249YS5wb3AoKTspc3QobixlKSxyJiZcImNyb3NzbGlua1wiPT09bi5mYW1pbHkudHlwZSYmZnQobix0LCdvbichPT1vZShuLCdvcCcpJiZyKX0sdXQ9ZT0+ZS5jbGVhcigpO2xldCBjdD0oZSx7ZGVlcDp0fT17fSk9PntsZXQgcj0wO2lmKGUub3duZXJTZXQmJmUub3duZXJTZXQuZGVsZXRlKGUpLEwoZSkpdXQocmUoZSkpO2Vsc2UgaWYoVyhlKSl7cj0xO2xldCB0PWUuaGlzdG9yeTt1dCh0LmV2ZW50cyksdXQodC5lZmZlY3RzKSx1dCh0LnN0b3JlcyksdXQodC5kb21haW5zKX1mdChYKGUpLCEhdCxyKX0sZHQ9ZT0+e2xldCB0PSgpPT5jdChlKTtyZXR1cm4gdC51bnN1YnNjcmliZT10LHR9LHB0PShlLHQscixuLG8pPT5hKHtub2RlOnIscGFyZW50OmUsY2hpbGQ6dCxzY29wZTp7Zm46b30sbWV0YTp7b3A6bn0sZmFtaWx5Ontvd25lcnM6W2UsdF0sbGlua3M6dH0scmVnaW9uYWw6MX0pLG10PWU9PntsZXQgdD0nZm9yd2FyZCcsW3tmcm9tOnIsdG86bn0sb109ZihlLDEpO3JldHVybiB4ZShyLHQsJ1wiZnJvbVwiJykseGUobix0LCdcInRvXCInKSxDZSh0LG4sJ3RvJyksZHQoYSh7cGFyZW50OnIsY2hpbGQ6bixtZXRhOntvcDp0LGNvbmZpZzpvfSxmYW1pbHk6e30scmVnaW9uYWw6MX0pKX0sZ3Q9KGUsdCk9PihyKHZlKHQpLCcud2F0Y2ggYXJndW1lbnQgc2hvdWxkIGJlIGEgZnVuY3Rpb24nKSxkdChhKHtzY29wZTp7Zm46dH0sbm9kZTpbemUoe2ZuOk1lfSldLHBhcmVudDplLG1ldGE6e29wOid3YXRjaCd9LGZhbWlseTp7b3duZXJzOmV9LHJlZ2lvbmFsOjF9KSkpLGh0PShlLHQscj1cImV2ZW50XCIpPT57bmUoZSkmJm5lKGUpLmhvb2tzW3JdKHQpfSx5dD0oZSx0LHIsbik9PntsZXQgYT1cImRvbWFpblwiPT09ZSxvPWZlKCksaT1sdCh7b3I6bixhbmQ6J3N0cmluZyc9PXR5cGVvZiByP3tuYW1lOnJ9OnJ9KSx7cGFyZW50Omw9bnVsbCxzaWQ6Zj1udWxsLG5hbWVkOnU9bnVsbH09aSxjPXV8fGkubmFtZXx8KGE/Jyc6byksZD1zKGMsbCkscD17b3A6dC5raW5kPWUsbmFtZTp0LnNob3J0TmFtZT1jLHNpZDp0LnNpZD1tZShmKSxuYW1lZDp1LHVuaXRJZDp0LmlkPW8sc2VyaWFsaXplOmkuc2VyaWFsaXplLGRlcml2ZWQ6aS5kZXJpdmVkLGNvbmZpZzppfTtpZih0LnBhcmVudD1sLHQuY29tcG9zaXRlTmFtZT1kLHQuZGVmYXVsdENvbmZpZz1pLHQudGhydT1lPT4oUSgwLCd0aHJ1JywnanMgcGlwZScpLGUodCkpLHQuZ2V0VHlwZT0oKT0+ZC5mdWxsTmFtZSwhYSl7dC5zdWJzY3JpYmU9ZT0+KHdlKGUpLHQud2F0Y2godmUoZSk/ZTp0PT5lLm5leHQmJmUubmV4dCh0KSkpLHRbUl09KCk9PnQ7bGV0IGU9cGUoKTtlJiYocC5uYXRpdmVUZW1wbGF0ZT1lKX1yZXR1cm4gcH07Y29uc3QgYnQ9KGUsdCxyLG4pPT57bGV0IGE7YmUocikmJihhPXIscj1yLmZuKTtsZXQgbz1jKHtuYW1lOmAke2Uuc2hvcnROYW1lfSBcXHUyMTkyICpgLGRlcml2ZWQ6MSxhbmQ6YX0pO3JldHVybiBwdChlLG8sbix0LHIpLG99LHZ0PShlLHQscixuLGEpPT57bGV0IG89ZWUodCksaT1xZSh7c3RvcmU6byx0bzpcImFcIixwcmlvcml0eToncmVhZCd9KTtyPT09UCYmKGkuZGF0YS5zb2Z0UmVhZD0xKTtsZXQgbD1baSxEZShuKV07cmV0dXJuIHUoJ3N0b3JlT25NYXAnLG8sbCxMKGUpJiZlZShlKSkscHQoZSx0LGwscixhKX0sa3Q9KHQsbixhLG8sbCk9PntsZXQgcz10P2U9PmUuc2xpY2UoKTplPT4oey4uLmV9KSxmPXQ/W106e30sYz1zKGYpLHA9UGUoYyksbT1QZSgxKTtwLnR5cGU9dD8nbGlzdCc6J3NoYXBlJyxwLm5vSW5pdD0xLHUoJ2NvbWJpbmVCYXNlJyxwLG0pO2xldCBnPWQoYyx7bmFtZTppKGEpLGRlcml2ZWQ6MSxhbmQ6b30pLGg9ZWUoZyk7aC5ub0luaXQ9MSxpZShnLCdpc0NvbWJpbmUnLDEpO2xldCB5PUZlKHApO3kub3JkZXI9e3ByaW9yaXR5OidiYXJyaWVyJ307bGV0IGI9W09lKCgoZSx0LHIpPT4oci5zY29wZSYmIXIuc2NvcGUucmVnW3AuaWRdJiYoci5jPTEpLGUpKSkseSxxZSh7c3RvcmU6bSx0bzonYid9KSxPZSgoKGUse2tleTp0fSxyKT0+e2lmKHIuY3x8ZSE9PXIuYVt0XSlyZXR1cm4gbiYmci5iJiYoci5hPXMoci5hKSksci5hW3RdPWUsMX0pLDEpLHFlKHtmcm9tOlwiYVwiLHRhcmdldDpwfSkscWUoe2Zyb206XCJ2YWx1ZVwiLHN0b3JlOjAsdGFyZ2V0Om19KSxxZSh7ZnJvbTpcInZhbHVlXCIsc3RvcmU6MSx0YXJnZXQ6bSxwcmlvcml0eTpcImJhcnJpZXJcIixiYXRjaDoxfSksRmUocCwxKSxsJiZEZSgpXTtyZXR1cm4gZShhLCgoZSx0KT0+e2lmKCFMKGUpKXJldHVybiByKCFFKGUpJiYha2UoZSksYGNvbWJpbmUgZXhwZWN0cyBhIHN0b3JlIGluIGEgZmllbGQgJHt0fWApLHZvaWQoY1t0XT1mW3RdPWUpO2ZbdF09ZS5kZWZhdWx0U3RhdGUsY1t0XT1lLmdldFN0YXRlKCk7bGV0IG49cHQoZSxnLGIsJ2NvbWJpbmUnLGwpO24uc2NvcGUua2V5PXQ7bGV0IGE9ZWUoZSk7RWUocCx7dHlwZTonZmllbGQnLGZpZWxkOnQsZnJvbTphfSksdSgnY29tYmluZUZpZWxkJyxhLG4pfSkpLGcuZGVmYXVsdFNoYXBlPWEsRWUoaCx7dHlwZTpQLGZyb206cCxmbjpsfSkscGUoKXx8KGcuZGVmYXVsdFN0YXRlPWw/aC5jdXJyZW50PWwoYyk6ZiksZ307bGV0IHd0PShlLHQscik9Pnt0cnl7cmV0dXJuWzEsZSguLi5yKV19Y2F0Y2goZSl7cmV0dXJuIHQoZSksWzAsbnVsbF19fSxTdD0oZSx0LHIsbixhKT0+aT0+byh7dGFyZ2V0OltuLHh0XSxwYXJhbXM6W3I/e3N0YXR1czonZG9uZScscGFyYW1zOmUscmVzdWx0Oml9OntzdGF0dXM6J2ZhaWwnLHBhcmFtczplLGVycm9yOml9LHt2YWx1ZTppLGZuOnI/dC5yczp0LnJqfV0sZGVmZXI6MSxwYWdlOmEucGFnZSxzY29wZTphZShhKX0pO2NvbnN0IHh0PWEoe25vZGU6W3plKHtmbjooe2ZuOmUsdmFsdWU6dH0pPT5lKHQpfSldLG1ldGE6e29wOidmeCcsZng6J3NpZGVjaGFpbid9fSksQ3Q9Wydzb3VyY2UnLCdjbG9jaycsJ3RhcmdldCddLCR0PShlLHQpPT5lK2A6ICR7dH0gc2hvdWxkIGJlIGRlZmluZWRgO2xldCBqdD0oZSx0LG4sYSxvLGksbCxzLGYsbSxnLGgpPT57bGV0IHk9ISFvO3IoIWtlKG4pfHwha2UodCksJHQoZSwnZWl0aGVyIHNvdXJjZSBvciBjbG9jaycpKTtsZXQgYj0wO2tlKG4pP2I9MTpFKG4pfHwobj1wKG4pKSxrZSh0KT90PW46KHhlKHQsZSwnY2xvY2snKSxBcnJheS5pc0FycmF5KHQpJiYodD13KHQpKSksYiYmKG49dCksc3x8bHx8KGw9bi5zaG9ydE5hbWUpO2xldCB2PSdub25lJzsoZ3x8YSkmJihFKGEpP3Y9J3VuaXQnOihyKHZlKGEpLCdgZmlsdGVyYCBzaG91bGQgYmUgZnVuY3Rpb24gb3IgdW5pdCcpLHY9J2ZuJykpLG8/KHhlKG8sZSwndGFyZ2V0JyksQ2UoZSxvKSk6J25vbmUnPT09diYmbSYmTChuKSYmTCh0KT9vPWQoaT9pKF9lKGVlKG4pKSxfZShlZSh0KSkpOl9lKGVlKG4pKSx7bmFtZTpsLHNpZDpoLG9yOnN9KToobz1jKHtuYW1lOmwsZGVyaXZlZDoxLG9yOnN9KSx1KCdzYW1wbGVUYXJnZXQnLFgobykpKTtsZXQgaz1QZSgpLFM9W107aWYoJ3VuaXQnPT09dil7bGV0W3Isbl09QXQoYSxvLHQsayxlKTtTPVsuLi5NdChuKSwuLi5NdChyKV19bGV0W3gsQ109QXQobixvLHQsayxlKTtyZXR1cm4gaGUobixbcHQodCxvLFt1KCdzYW1wbGVTb3VyY2VMb2FkZXInKSxxZSh7ZnJvbTpfLHRhcmdldDprfSksLi4uTXQoQyksRmUoeCwxLGYpLC4uLlMsRmUoayksJ2ZuJz09PXYmJkRlKCgoZSx0LHthOnJ9KT0+YShlLHIpKSwxKSxpJiZEZSgkZSksdSgnc2FtcGxlU291cmNlVXB3YXJkJyx5KV0sZSxpKV0pLG99O2NvbnN0IE10PWU9PltGZShlKSxPZSgoKGUsdCx7YTpyfSk9PnIpLDEpXSxBdD0oZSx0LHIsbixvKT0+e2xldCBpPUwoZSksbD1pP2VlKGUpOlBlKCkscz1QZShpKTtyZXR1cm4gaXx8YSh7cGFyZW50OmUsbm9kZTpbcWUoe2Zyb206Xyx0YXJnZXQ6bH0pLHFlKHtmcm9tOlwidmFsdWVcIixzdG9yZToxLHRhcmdldDpzfSldLGZhbWlseTp7b3duZXJzOltlLHQscl0sbGlua3M6dH0sbWV0YTp7b3A6b30scmVnaW9uYWw6MX0pLHUoJ3NhbXBsZVNvdXJjZScscyxsLG4pLFtsLHNdfSxJdD0oZSx0LHIsbik9PntsZXQgYT1lW3RdO2EmJm8oe3RhcmdldDphLHBhcmFtczpBcnJheS5pc0FycmF5KGEpP2EubWFwKCgoKT0+cikpOnIsZGVmZXI6MSxzdGFjazpufSl9LHF0PVwiMjIuMy4wXCI7ZXhwb3J0e00gYXMgYWxsU2V0dGxlZCx5IGFzIGF0dGFjaCxjdCBhcyBjbGVhck5vZGUscCBhcyBjb21iaW5lLGIgYXMgY3JlYXRlQXBpLHYgYXMgY3JlYXRlRG9tYWluLGggYXMgY3JlYXRlRWZmZWN0LGMgYXMgY3JlYXRlRXZlbnQsYSBhcyBjcmVhdGVOb2RlLGQgYXMgY3JlYXRlU3RvcmUsbSBhcyBjcmVhdGVTdG9yZU9iamVjdCxGIGFzIGNyZWF0ZVdhdGNoLHEgYXMgZm9yayxtdCBhcyBmb3J3YXJkLGsgYXMgZnJvbU9ic2VydmFibGUsQyBhcyBndWFyZCxOIGFzIGh5ZHJhdGUsVSBhcyBpcyxvIGFzIGxhdW5jaCx3IGFzIG1lcmdlLCQgYXMgcmVzdG9yZSx4IGFzIHNhbXBsZSx6IGFzIHNjb3BlQmluZCxPIGFzIHNlcmlhbGl6ZSxsIGFzIHNldFN0b3JlTmFtZSxqIGFzIHNwbGl0LFJlIGFzIHN0ZXAscXQgYXMgdmVyc2lvbixnZSBhcyB3aXRoRmFjdG9yeSxuIGFzIHdpdGhSZWdpb259O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZWZmZWN0b3IubWpzLm1hcFxuIiwiLyoqXG4gKiBtb2QuanMudHMgaXMgYSBUeXBlc2NyaXB0LWZyaWVuZGx5IERlbm8tc3R5bGUgc3RyYXRlZ3kgb2YgYnJpbmdpbmcgaW5cbiAqIHNlbGVjdGl2ZSBzZXJ2ZXItc2lkZSBUeXBlc2NyaXB0IGZ1bmN0aW9ucyBhbmQgbW9kdWxlcyBpbnRvIGNsaWVudC1zaWRlXG4gKiBicm93c2VyIGFuZCBvdGhlciB1c2VyIGFnZW50IEphdmFzY3JpcHQgcnVudGltZXMuXG4gKlxuICogbW9kLmpzLnRzIHNob3VsZCBiZSBEZW5vIGJ1bmRsZWQgaW50byBtb2QuYXV0by5qcyBhc3N1bWluZyB0aGF0XG4gKiBtb2QuYXV0by5qcyBleGlzdHMgYXMgYSBcInR3aW5cIi4gVGhlIGV4aXN0ZW5jZSBvZiB0aGUgbW9kLmF1dG8uanMgKGV2ZW4gYW5cbiAqIGVtcHR5IG9uZSkgaXMgYSBzaWduYWwgdG8gdGhlIGJ1bmRsZXIgdG8gZ2VuZXJhdGUgdGhlIHR3aW4gKi5hdXRvLmpzIGZpbGUuXG4gKiBIVE1MIGFuZCBjbGllbnQtc2lkZSBzb3VyY2UgcHVsbHMgaW4gKi5hdXRvLmpzIGJ1dCBzaW5jZSBpdCdzIGdlbmVyYXRlZCBmcm9tXG4gKiB0aGlzIGZpbGUgd2Uga25vdyBpdCB3aWxsIGJlIGNvcnJlY3QuXG4gKlxuICogUkVNSU5ERVI6IG1vZC5hdXRvLmpzIG11c3QgZXhpc3QgaW4gb3JkZXIgZm9yIG1vZC5qcy50cyB0byBiZSBidW5kbGVkLlxuICogICAgICAgICAgIGlmIGl0IGRvZXNuJ3QgZXhpc3QganVzdCBjcmVhdGUgYSBlbXB0eSBmaWxlIG5hbWVkIG1vZC5hdXRvLmpzXG4gKi9cblxuaW1wb3J0IHsgY3JlYXRlRG9tYWluIH0gZnJvbSBcImh0dHBzOi8vdW5wa2cuY29tL2VmZmVjdG9yQDIyLjMuMC9lZmZlY3Rvci5tanNcIjtcblxuLy8gVXNpbmcgU2VydmVyIFNlbnQgRXZlbnRzIChTU0VzIG9yIFwiRXZlbnRTb3VyY2VcIikgb24gYW55dGhpbmcgYnV0IEhUVFAvMiBjb25uZWN0aW9ucyBpcyBub3QgcmVjb21tZW5kZWQuXG4vLyBTZWUgW0V2ZW50U291cmNlXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvRXZlbnRTb3VyY2UpIHdhcm5pbmcgc2VjdGlvbi5cbi8vIFNlZSBbRXZlbnRTb3VyY2U6IHdoeSBubyBtb3JlIHRoYW4gNiBjb25uZWN0aW9ucz9dKGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE2ODUyNjkwL3NzZWV2ZW50c291cmNlLXdoeS1uby1tb3JlLXRoYW4tNi1jb25uZWN0aW9ucykuXG5cbmV4cG9ydCBpbnRlcmZhY2UgVHVubmVsT3B0aW9ucyB7XG4gIHJlYWRvbmx5IG1pbGxpc2Vjc0JldHdlZW5SZWNvbm5lY3RBdHRlbXB0cz86IG51bWJlcjtcbiAgcmVhZG9ubHkgbWF4UmVjb25uZWN0QXR0ZW1wdHM/OiBudW1iZXI7XG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIHJlYWRvbmx5IGRvbWFpbj86IGFueTsgLy8gRWZmZWN0b3IgRG9tYWluLCB1bnR5cGVkIHdoaWxlIHdlIGZpZ3VyZSBvdXQgaG93IHRvIHR5cGUgaXRcbn1cblxuLyoqXG4gKiBjb25zdHJ1Y3RFdmVudFNvdXJjZSB3aWxsIGJlIGNhbGxlZCB1cG9uIGVhY2ggY29ubmVjdGlvbiBvZiBFUy4gQ2FsbGVyIHNob3VsZFxuICogdXNlIHRoaXMgZmFjdG9yeSBmdW5jdGlvbiB0byBzZXR1cCB0aGUgZnVsbCBFdmVudFNvdXJjZSwgaW5jbHVkaW5nIGFueVxuICogb25tZXNzYWdlIG9yIGV2ZW50IGxpc3RlbmVycyBiZWNhdXNlIHJlY29ubmVjdGlvbnMgd2lsbCBjbG9zZSBwcmV2aW91cyBFU3NcbiAqIGFuZCByZWNyZWF0ZSB0aGUgRXZlbnRTb3VyY2UgZXZlcnkgdGltZSBhIGNvbm5lY3Rpb24gaXMgXCJicm9rZW5cIi5cbiAqXG4gKiBXZSdyZSB1c2luZyBhIGdlbmVyaWMgRXZlbnRTb3VyY2UgYmVjYXVzZSB3ZSBidWlsZCBpbiBEZW5vIGJ1dCBEZW5vIGRvZXNuJ3RcbiAqIGtub3cgd2hhdCBhbiBFdmVudFNvdXJjZSBpcyAoaXQncyBrbm93biBpbiBicm93c2VycykuIFRoaXMgZGlkIG5vdCB3b3JrOlxuICogICAgIC8vLyA8cmVmZXJlbmNlIGxpYj1cImRvbVwiIC8+XG4gKiBub3RlOiA8cmVmZXJlbmNlIGxpYj1cImRvbVwiIC8+IHdvcmtzIGluIFZTIENvZGUgYnV0IGNyZWF0ZWQgRGVuby5lbWl0KCkgYW5kXG4gKiAncGF0aC10YXNrIGJ1bmRsZS1hbGwnIGVycm9ycy5cbiAqIFRPRE9bZXNzZW50aWFsXTogZmlndXJlIG91dCBob3cgdG8gbm90IHVzZSBFdmVudFNvdXJjZSBnZW5lcmljLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEV2ZW50U291cmNlVHVubmVsT3B0aW9uczxFdmVudFNvdXJjZSA9IHVua25vd24+XG4gIGV4dGVuZHMgVHVubmVsT3B0aW9ucyB7XG4gIHJlYWRvbmx5IGNvbnN0cnVjdEV2ZW50U291cmNlOiAoZXNVUkw6IHN0cmluZykgPT4gRXZlbnRTb3VyY2U7XG59XG5cbi8qKlxuICogQW4gZXNUdW5uZWwgaXMgYSBzZXQgb2YgRWZmZWN0b3ItYmFzZWQgZXZlbnRzIHdoaWNoIG1hbmFnZXMgYW4gRXZlbnRTb3VyY2UtXG4gKiBiYXNlZCBcInR1bm5lbFwiIHRoYXQgY2FuIGF1dG9tYXRpY2FsbHkgcmVjb25uZWN0IG9uIGVycm9ycy5cbiAqXG4gKiBjb25zdCB0dW5uZWwgPSBlc1R1bm5lbCh7IGNvbnN0cnVjdEV2ZW50U291cmNlOiAoZXNVUkwpID0+IG5ldyBFdmVudFNvdXJjZShlc1VSTCkgfSk7XG4gKiB0dW5uZWwuY29ubmVjdGVkLndhdGNoKChwYXlsb2FkKSA9PiB7IGNvbnNvbGUubG9nKCdjb25uZWN0ZWQgdG8gZXZlbnQgc291cmNlJywgcGF5bG9hZC5ldmVudFNvdXJjZSk7IH0pO1xuICogdHVubmVsLiRzdGF0dXMud2F0Y2goKHN0YXR1c1RleHQpID0+IGNvbnNvbGUubG9nKCd0dW5uZWwgaXMnLCBzdGF0dXNUZXh0KSk7XG4gKiB0dW5uZWwuY29ubmVjdCh7IHZhbGlkYXRlVVJMOiBcIi9zeW50aGV0aWMvc3NlL3BpbmdcIiwgZXNVUkw6IFwiL3N5bnRoZXRpYy9zc2UvdHVubmVsXCIgfSk7XG4gKlxuICogQHBhcmFtIG9wdGlvbnMgU3VwcGxpZXMgdGhlIEV2ZW50U291cmNlIGZhY3RvcnkgZnVuY3Rpb24sIEVmZmVjdG9yIGRvbWFpbiwgYW5kIHJlY29ubmVjdGlvbiBvcHRpb25zXG4gKiBAcmV0dXJucyBFZmZlY3RvciBTU0UgbGlmZWN5Y2xlIGV2ZW50cyBjb25uZWN0LCBjb25uZWN0ZWQsIHJlY29ubmVjdCwgYWJvcnQgYW5kICRzdGF1cyBzdG9yZVxuICovXG4vLyBUT0RPW2Vzc2VudGlhbF06IGZpZ3VyZSBvdXQgaG93IHRvIHByb3Blcmx5IHR5cGUgY3JlYXRlRG9tYWluIGluIERlbm9cbmV4cG9ydCBmdW5jdGlvbiBlc1R1bm5lbChvcHRpb25zOiBFdmVudFNvdXJjZVR1bm5lbE9wdGlvbnMpIHtcbiAgY29uc3Qge1xuICAgIGNvbnN0cnVjdEV2ZW50U291cmNlLFxuICAgIGRvbWFpbiA9IGNyZWF0ZURvbWFpbihcImVzVHVubmVsXCIpLFxuICAgIG1heFJlY29ubmVjdEF0dGVtcHRzID0gMzAsXG4gICAgbWlsbGlzZWNzQmV0d2VlblJlY29ubmVjdEF0dGVtcHRzID0gMTAwMCxcbiAgfSA9IG9wdGlvbnM7XG5cbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgbGV0IGV2ZW50U291cmNlOiBhbnkgPSB1bmRlZmluZWQ7IC8vIHRoaXMgbWF5IGJlIHJlLWNyZWF0ZWQgYXQgYW55IHRpbWVcbiAgY29uc3QgY29ubmVjdCA9IGRvbWFpbi5jcmVhdGVFdmVudChcImNvbm5lY3RcIik7XG4gIGNvbnN0IGNvbm5lY3RlZCA9IGRvbWFpbi5jcmVhdGVFdmVudChcImNvbm5lY3RlZFwiKTtcbiAgY29uc3QgcmVjb25uZWN0ID0gZG9tYWluLmNyZWF0ZUV2ZW50KFwicmVjb25uZWN0XCIpO1xuICBjb25zdCBhYm9ydCA9IGRvbWFpbi5jcmVhdGVFdmVudChcImFib3J0XCIpO1xuXG4gIGNvbnN0ICRzdGF0dXMgPSBkb21haW4uY3JlYXRlU3RvcmUoXCJpbml0aWFsXCIpXG4gICAgLm9uKFxuICAgICAgY29ubmVjdCxcbiAgICAgIChfOiB1bmtub3duLCBwYXlsb2FkOiB7IGF0dGVtcHQ6IG51bWJlciB9KSA9PlxuICAgICAgICBgY29ubmVjdGluZyAke3BheWxvYWQuYXR0ZW1wdCA/PyAxfS8ke21heFJlY29ubmVjdEF0dGVtcHRzfWAsXG4gICAgKVxuICAgIC5vbihjb25uZWN0ZWQsICgpID0+IFwiY29ubmVjdGVkXCIpXG4gICAgLm9uKFxuICAgICAgcmVjb25uZWN0LFxuICAgICAgKF86IHVua25vd24sIHBheWxvYWQ6IHsgYXR0ZW1wdDogbnVtYmVyIH0pID0+XG4gICAgICAgIGBjb25uZWN0aW5nICR7cGF5bG9hZC5hdHRlbXB0fS8ke21heFJlY29ubmVjdEF0dGVtcHRzfWAsXG4gICAgKVxuICAgIC5vbihhYm9ydCwgKCkgPT4gYGFib3J0ZWQgYWZ0ZXIgJHttYXhSZWNvbm5lY3RBdHRlbXB0c30gdHJpZXNgKTtcblxuICBjb25uZWN0LndhdGNoKFxuICAgIChcbiAgICAgIHsgdmFsaWRhdGVVUkwsIGVzVVJMLCBhdHRlbXB0ID0gMCB9OiB7XG4gICAgICAgIHJlYWRvbmx5IHZhbGlkYXRlVVJMOiBzdHJpbmc7XG4gICAgICAgIHJlYWRvbmx5IGVzVVJMOiBzdHJpbmc7XG4gICAgICAgIHJlYWRvbmx5IGF0dGVtcHQ/OiBudW1iZXI7XG4gICAgICB9LFxuICAgICkgPT4ge1xuICAgICAgaWYgKGV2ZW50U291cmNlKSBldmVudFNvdXJjZS5jbG9zZSgpO1xuXG4gICAgICBpZiAoYXR0ZW1wdCA+IG1heFJlY29ubmVjdEF0dGVtcHRzKSB7XG4gICAgICAgIGFib3J0KHtcbiAgICAgICAgICB2YWxpZGF0ZVVSTCxcbiAgICAgICAgICBlc1VSTCxcbiAgICAgICAgICBhdHRlbXB0LFxuICAgICAgICAgIHdoeTogXCJtYXgtcmVjb25uZWN0LWF0dGVtcHRzLWV4Y2VlZGVkXCIsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGZldGNoKHZhbGlkYXRlVVJMKS50aGVuKChyZXNwKSA9PiB7XG4gICAgICAgIGlmIChyZXNwLm9rKSB7XG4gICAgICAgICAgZXZlbnRTb3VyY2UgPSBjb25zdHJ1Y3RFdmVudFNvdXJjZShlc1VSTCk7XG4gICAgICAgICAgZXZlbnRTb3VyY2Uub25vcGVuID0gKGVzT25PcGVuRXZlbnQ6IEV2ZW50KSA9PlxuICAgICAgICAgICAgY29ubmVjdGVkKHtcbiAgICAgICAgICAgICAgZXNPbk9wZW5FdmVudCxcbiAgICAgICAgICAgICAgZXZlbnRTb3VyY2UsXG4gICAgICAgICAgICAgIGVzVVJMLFxuICAgICAgICAgICAgICB2YWxpZGF0ZVVSTCxcbiAgICAgICAgICAgICAgYXR0ZW1wdCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIGV2ZW50U291cmNlLm9uZXJyb3IgPSAoZXNPbkVycm9yRXZlbnQ6IEV2ZW50KSA9PlxuICAgICAgICAgICAgcmVjb25uZWN0KHtcbiAgICAgICAgICAgICAgYXR0ZW1wdCxcbiAgICAgICAgICAgICAgZXNPbkVycm9yRXZlbnQsXG4gICAgICAgICAgICAgIGVzVVJMLFxuICAgICAgICAgICAgICB2YWxpZGF0ZVVSTCxcbiAgICAgICAgICAgICAgd2h5OiBcImV2ZW50LXNvdXJjZS1lcnJvclwiLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVjb25uZWN0KHtcbiAgICAgICAgICAgIGF0dGVtcHQsXG4gICAgICAgICAgICBlc1VSTCxcbiAgICAgICAgICAgIHZhbGlkYXRlVVJMLFxuICAgICAgICAgICAgd2h5OiBcImZldGNoLXJlc3Atbm90LW9rXCIsXG4gICAgICAgICAgICBodHRwU3RhdHVzOiByZXNwLnN0YXR1cyxcbiAgICAgICAgICAgIGh0dHBTdGF0dXNUZXh0OiByZXNwLnN0YXR1c1RleHQsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pLmNhdGNoKChmZXRjaEVycm9yKSA9PlxuICAgICAgICByZWNvbm5lY3Qoe1xuICAgICAgICAgIGF0dGVtcHQsXG4gICAgICAgICAgZmV0Y2hFcnJvcixcbiAgICAgICAgICBlc1VSTCxcbiAgICAgICAgICB2YWxpZGF0ZVVSTCxcbiAgICAgICAgICB3aHk6IFwiZmV0Y2gtZmFpbGVkXCIsXG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH0sXG4gICk7XG5cbiAgcmVjb25uZWN0LndhdGNoKChwYXlsb2FkOiB7XG4gICAgcmVhZG9ubHkgdmFsaWRhdGVVUkw6IHN0cmluZztcbiAgICByZWFkb25seSBlc1VSTDogc3RyaW5nO1xuICAgIHJlYWRvbmx5IGF0dGVtcHQ6IG51bWJlcjtcbiAgfSkgPT4ge1xuICAgIHNldFRpbWVvdXQoXG4gICAgICAoKSA9PlxuICAgICAgICBjb25uZWN0KHtcbiAgICAgICAgICB2YWxpZGF0ZVVSTDogcGF5bG9hZC52YWxpZGF0ZVVSTCxcbiAgICAgICAgICBlc1VSTDogcGF5bG9hZC5lc1VSTCxcbiAgICAgICAgICBhdHRlbXB0OiBwYXlsb2FkLmF0dGVtcHQgKyAxLFxuICAgICAgICB9KSxcbiAgICAgIG1pbGxpc2Vjc0JldHdlZW5SZWNvbm5lY3RBdHRlbXB0cyxcbiAgICApO1xuICB9KTtcblxuICByZXR1cm4ge1xuICAgIGNvbm5lY3QsXG4gICAgY29ubmVjdGVkLFxuICAgIHJlY29ubmVjdCxcbiAgICBhYm9ydCxcbiAgICAkc3RhdHVzLFxuICB9O1xufVxuXG4vKipcbiAqIGNvbnN0cnVjdFdlYlNvY2tldCB3aWxsIGJlIGNhbGxlZCB1cG9uIGVhY2ggY29ubmVjdGlvbiBvZiBXUy4gQ2FsbGVyIHNob3VsZFxuICogdXNlIHRoaXMgZmFjdG9yeSBmdW5jdGlvbiB0byBzZXR1cCB0aGUgZnVsbCBXZWJTb2NrZXQsIGluY2x1ZGluZyBhbnlcbiAqIG9ubWVzc2FnZSBvciBldmVudCBsaXN0ZW5lcnMgYmVjYXVzZSByZWNvbm5lY3Rpb25zIHdpbGwgY2xvc2UgcHJldmlvdXMgV1NzXG4gKiBhbmQgcmVjcmVhdGUgdGhlIFdlYlNvY2tldCBldmVyeSB0aW1lIGEgY29ubmVjdGlvbiBpcyBcImJyb2tlblwiLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFdlYlNvY2tldFR1bm5lbE9wdGlvbnMgZXh0ZW5kcyBUdW5uZWxPcHRpb25zIHtcbiAgcmVhZG9ubHkgY29uc3RydWN0V2ViU29ja2V0OiAod3NVUkw6IHN0cmluZykgPT4gV2ViU29ja2V0O1xuICByZWFkb25seSBhbGxvd0Nsb3NlPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBBbiB3c1R1bm5lbCBpcyBhIHNldCBvZiBFZmZlY3Rvci1iYXNlZCBldmVudHMgd2hpY2ggbWFuYWdlcyBhIFdlYlNvY2tldC1cbiAqIGJhc2VkIFwidHVubmVsXCIgdGhhdCBjYW4gYXV0b21hdGljYWxseSByZWNvbm5lY3Qgb24gZXJyb3JzLlxuICpcbiAqIGNvbnN0IHR1bm5lbCA9IHdzVHVubmVsKHsgY29uc3RydWN0V2ViU29ja2V0OiAod3NVUkwpID0+IG5ldyBXZWJTb2NrZXQod3NVUkwpIH0pO1xuICogdHVubmVsLmNvbm5lY3RlZC53YXRjaCgocGF5bG9hZCkgPT4geyBjb25zb2xlLmxvZygnY29ubmVjdGVkIHRvIGV2ZW50IHNvdXJjZScsIHBheWxvYWQuZXZlbnRTb3VyY2UpOyB9KTtcbiAqIHR1bm5lbC4kc3RhdHVzLndhdGNoKChzdGF0dXNUZXh0KSA9PiBjb25zb2xlLmxvZygndHVubmVsIGlzJywgc3RhdHVzVGV4dCkpO1xuICogdHVubmVsLmNvbm5lY3QoeyB2YWxpZGF0ZVVSTDogXCIvc3ludGhldGljL3dzL3BpbmdcIiwgd3NVUkw6IFwiL3N5bnRoZXRpYy93cy90dW5uZWxcIiB9KTtcbiAqXG4gKiBAcGFyYW0gb3B0aW9ucyBTdXBwbGllcyB0aGUgV2ViU29ja2V0IGZhY3RvcnkgZnVuY3Rpb24sIEVmZmVjdG9yIGRvbWFpbiwgYW5kIHJlY29ubmVjdGlvbiBvcHRpb25zXG4gKiBAcmV0dXJucyBFZmZlY3RvciBXUyBsaWZlY3ljbGUgZXZlbnRzIGNvbm5lY3QsIGNvbm5lY3RlZCwgcmVjb25uZWN0LCBhYm9ydCBhbmQgJHN0YXVzIHN0b3JlXG4gKi9cbi8vIFRPRE9bZXNzZW50aWFsXTogZmlndXJlIG91dCBob3cgdG8gcHJvcGVybHkgdHlwZSBjcmVhdGVEb21haW4gaW4gRGVub1xuZXhwb3J0IGZ1bmN0aW9uIHdzVHVubmVsKG9wdGlvbnM6IFdlYlNvY2tldFR1bm5lbE9wdGlvbnMpIHtcbiAgY29uc3Qge1xuICAgIGNvbnN0cnVjdFdlYlNvY2tldCxcbiAgICBkb21haW4gPSBjcmVhdGVEb21haW4oXCJ3c1R1bm5lbFwiKSxcbiAgICBtYXhSZWNvbm5lY3RBdHRlbXB0cyA9IDMwLFxuICAgIG1pbGxpc2Vjc0JldHdlZW5SZWNvbm5lY3RBdHRlbXB0cyA9IDEwMDAsXG4gICAgYWxsb3dDbG9zZSA9IGZhbHNlLFxuICB9ID0gb3B0aW9ucztcblxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBsZXQgd2ViU29ja2V0OiBhbnkgPSB1bmRlZmluZWQ7IC8vIHRoaXMgbWF5IGJlIHJlLWNyZWF0ZWQgYXQgYW55IHRpbWVcbiAgY29uc3QgY29ubmVjdCA9IGRvbWFpbi5jcmVhdGVFdmVudChcImNvbm5lY3RcIik7XG4gIGNvbnN0IGNvbm5lY3RlZCA9IGRvbWFpbi5jcmVhdGVFdmVudChcImNvbm5lY3RlZFwiKTtcbiAgY29uc3QgcmVjb25uZWN0ID0gZG9tYWluLmNyZWF0ZUV2ZW50KFwicmVjb25uZWN0XCIpO1xuICBjb25zdCBhYm9ydCA9IGRvbWFpbi5jcmVhdGVFdmVudChcImFib3J0XCIpO1xuXG4gIGNvbnN0ICRzdGF0dXMgPSBkb21haW4uY3JlYXRlU3RvcmUoXCJpbml0aWFsXCIpXG4gICAgLm9uKFxuICAgICAgY29ubmVjdCxcbiAgICAgIChfOiB1bmtub3duLCBwYXlsb2FkOiB7IGF0dGVtcHQ6IG51bWJlciB9KSA9PlxuICAgICAgICBgY29ubmVjdGluZyAke3BheWxvYWQuYXR0ZW1wdCA/PyAxfS8ke21heFJlY29ubmVjdEF0dGVtcHRzfWAsXG4gICAgKVxuICAgIC5vbihjb25uZWN0ZWQsICgpID0+IFwiY29ubmVjdGVkXCIpXG4gICAgLm9uKFxuICAgICAgcmVjb25uZWN0LFxuICAgICAgKF86IHVua25vd24sIHBheWxvYWQ6IHsgYXR0ZW1wdDogbnVtYmVyIH0pID0+XG4gICAgICAgIGBjb25uZWN0aW5nICR7cGF5bG9hZC5hdHRlbXB0fS8ke21heFJlY29ubmVjdEF0dGVtcHRzfWAsXG4gICAgKVxuICAgIC5vbihhYm9ydCwgKCkgPT4gYGFib3J0ZWQgYWZ0ZXIgJHttYXhSZWNvbm5lY3RBdHRlbXB0c30gdHJpZXNgKTtcblxuICBjb25uZWN0LndhdGNoKFxuICAgIChcbiAgICAgIHsgdmFsaWRhdGVVUkwsIHdzVVJMLCBhdHRlbXB0ID0gMCB9OiB7XG4gICAgICAgIHJlYWRvbmx5IHZhbGlkYXRlVVJMOiBzdHJpbmc7XG4gICAgICAgIHJlYWRvbmx5IHdzVVJMOiBzdHJpbmc7XG4gICAgICAgIHJlYWRvbmx5IGF0dGVtcHQ/OiBudW1iZXI7XG4gICAgICB9LFxuICAgICkgPT4ge1xuICAgICAgaWYgKHdlYlNvY2tldCkgd2ViU29ja2V0LmNsb3NlKCk7XG5cbiAgICAgIGlmIChhdHRlbXB0ID4gbWF4UmVjb25uZWN0QXR0ZW1wdHMpIHtcbiAgICAgICAgYWJvcnQoe1xuICAgICAgICAgIHZhbGlkYXRlVVJMLFxuICAgICAgICAgIHdzVVJMLFxuICAgICAgICAgIGF0dGVtcHQsXG4gICAgICAgICAgd2h5OiBcIm1heC1yZWNvbm5lY3QtYXR0ZW1wdHMtZXhjZWVkZWRcIixcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZmV0Y2godmFsaWRhdGVVUkwpLnRoZW4oKHJlc3ApID0+IHtcbiAgICAgICAgaWYgKHJlc3Aub2spIHtcbiAgICAgICAgICB3ZWJTb2NrZXQgPSBjb25zdHJ1Y3RXZWJTb2NrZXQod3NVUkwpO1xuICAgICAgICAgIHdlYlNvY2tldC5vbm9wZW4gPSAod3NPbk9wZW5FdmVudDogRXZlbnQpID0+XG4gICAgICAgICAgICBjb25uZWN0ZWQoe1xuICAgICAgICAgICAgICB3c09uT3BlbkV2ZW50LFxuICAgICAgICAgICAgICB3ZWJTb2NrZXQsXG4gICAgICAgICAgICAgIHdzVVJMLFxuICAgICAgICAgICAgICB2YWxpZGF0ZVVSTCxcbiAgICAgICAgICAgICAgYXR0ZW1wdCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIHdlYlNvY2tldC5vbmNsb3NlID0gKHdzT25DbG9zZUV2ZW50OiBFdmVudCkgPT4ge1xuICAgICAgICAgICAgaWYgKCFhbGxvd0Nsb3NlKSB7XG4gICAgICAgICAgICAgIHJlY29ubmVjdCh7XG4gICAgICAgICAgICAgICAgYXR0ZW1wdCxcbiAgICAgICAgICAgICAgICB3c09uQ2xvc2VFdmVudCxcbiAgICAgICAgICAgICAgICB3c1VSTCxcbiAgICAgICAgICAgICAgICB2YWxpZGF0ZVVSTCxcbiAgICAgICAgICAgICAgICB3aHk6IFwid2ViLXNvY2tldC1jbG9zZS1ub3QtYWxsb3dlZFwiLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICAgIHdlYlNvY2tldC5vbmVycm9yID0gKHdzT25FcnJvckV2ZW50OiBFdmVudCkgPT5cbiAgICAgICAgICAgIHJlY29ubmVjdCh7XG4gICAgICAgICAgICAgIGF0dGVtcHQsXG4gICAgICAgICAgICAgIHdzT25FcnJvckV2ZW50LFxuICAgICAgICAgICAgICB3c1VSTCxcbiAgICAgICAgICAgICAgdmFsaWRhdGVVUkwsXG4gICAgICAgICAgICAgIHdoeTogXCJ3ZWItc29ja2V0LWVycm9yXCIsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZWNvbm5lY3Qoe1xuICAgICAgICAgICAgYXR0ZW1wdCxcbiAgICAgICAgICAgIHdzVVJMLFxuICAgICAgICAgICAgdmFsaWRhdGVVUkwsXG4gICAgICAgICAgICB3aHk6IFwiZmV0Y2gtcmVzcC1ub3Qtb2tcIixcbiAgICAgICAgICAgIGh0dHBTdGF0dXM6IHJlc3Auc3RhdHVzLFxuICAgICAgICAgICAgaHR0cFN0YXR1c1RleHQ6IHJlc3Auc3RhdHVzVGV4dCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSkuY2F0Y2goKGZldGNoRXJyb3IpID0+XG4gICAgICAgIHJlY29ubmVjdCh7XG4gICAgICAgICAgYXR0ZW1wdCxcbiAgICAgICAgICBmZXRjaEVycm9yLFxuICAgICAgICAgIHdzVVJMLFxuICAgICAgICAgIHZhbGlkYXRlVVJMLFxuICAgICAgICAgIHdoeTogXCJmZXRjaC1mYWlsZWRcIixcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSxcbiAgKTtcblxuICByZWNvbm5lY3Qud2F0Y2goKHBheWxvYWQ6IHtcbiAgICByZWFkb25seSB2YWxpZGF0ZVVSTDogc3RyaW5nO1xuICAgIHJlYWRvbmx5IHdzVVJMOiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgYXR0ZW1wdDogbnVtYmVyO1xuICB9KSA9PiB7XG4gICAgc2V0VGltZW91dChcbiAgICAgICgpID0+XG4gICAgICAgIGNvbm5lY3Qoe1xuICAgICAgICAgIHZhbGlkYXRlVVJMOiBwYXlsb2FkLnZhbGlkYXRlVVJMLFxuICAgICAgICAgIHdzVVJMOiBwYXlsb2FkLndzVVJMLFxuICAgICAgICAgIGF0dGVtcHQ6IHBheWxvYWQuYXR0ZW1wdCArIDEsXG4gICAgICAgIH0pLFxuICAgICAgbWlsbGlzZWNzQmV0d2VlblJlY29ubmVjdEF0dGVtcHRzLFxuICAgICk7XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgY29ubmVjdCxcbiAgICBjb25uZWN0ZWQsXG4gICAgcmVjb25uZWN0LFxuICAgIGFib3J0LFxuICAgICRzdGF0dXMsXG4gIH07XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztJQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO0NBQUM7QUFBQSxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0lBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Q0FBQztBQUFBLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7SUFBQyxJQUFHLENBQUMsQ0FBQyxFQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0NBQUM7QUFBaUosU0FBUyxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQSxFQUFDLElBQUksRUFBQyxDQUFDLENBQUEsRUFBQyxNQUFNLEVBQUMsQ0FBQyxDQUFBLEVBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEVBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQSxFQUFDLE1BQU0sRUFBQyxDQUFDLENBQUEsRUFBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUEsRUFBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQSxFQUFDLElBQUksRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFBLEVBQUMsTUFBTSxFQUFDLENBQUMsR0FBQztJQUFDLElBQUksRUFBQyxTQUFTO0NBQUMsQ0FBQSxFQUFDLFFBQVEsRUFBQyxDQUFDLENBQUEsRUFBQyxHQUFDLEVBQUUsRUFBQztJQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxBQUFDO0lBQUEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBLENBQUMsR0FBRSxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBRSxDQUFDO0lBQUEsSUFBSSxDQUFDLEdBQUM7UUFBQyxFQUFFLEVBQUMsRUFBRSxFQUFFO1FBQUMsR0FBRyxFQUFDLENBQUM7UUFBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUFDLElBQUksRUFBQyxDQUFDO1FBQUMsS0FBSyxFQUFDLENBQUM7UUFBQyxNQUFNLEVBQUM7WUFBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLElBQUksSUFBRSxXQUFXO1lBQUMsS0FBSyxFQUFDLENBQUM7WUFBQyxNQUFNLEVBQUMsQ0FBQztTQUFDO0tBQUMsQUFBQztJQUFBLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBLENBQUMsR0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBLENBQUMsR0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBLENBQUMsR0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBRSxFQUFDLENBQUMsSUFBRSxFQUFFLElBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBQztRQUFDLENBQUM7S0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBO0NBQUM7QUFBQSxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztJQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsSUFBSSxFQUFDLENBQUMsR0FBQyxFQUFFLEFBQUM7SUFBQSxJQUFHLENBQUMsQ0FBQyxNQUFNLElBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLEdBQUMsTUFBTSxJQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxJQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFDLENBQUMsSUFBRSxFQUFFLElBQUUsQ0FBQyxLQUFHLEVBQUUsSUFBRSxDQUFDLEVBQUUsR0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksSUFBSSxFQUFDLEdBQUMsQ0FBQyxFQUFDLEVBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO1NBQUssRUFBRSxDQUFDLE1BQU0sRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7SUFBQSxJQUFHLENBQUMsSUFBRSxDQUFDLEVBQUUsRUFBQyxPQUFPO0lBQUEsSUFBSSxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUM7UUFBQyxNQUFNLEVBQUMsRUFBRTtRQUFDLFdBQVcsRUFBQyxFQUFFO1FBQUMsS0FBSyxFQUFDLEVBQUU7UUFBQyxPQUFPLEVBQUMsRUFBRTtRQUFDLE1BQU0sRUFBQyxFQUFFO0tBQUMsQUFBQztJQUFBLEVBQUUsR0FBQyxDQUFDLENBQUM7SUFBQSxDQUFDLEVBQUMsTUFBSyxDQUFDLEdBQUMsRUFBRSxFQUFFLEVBQUU7UUFBQyxJQUFHLEVBQUMsR0FBRyxFQUFDLEVBQUMsQ0FBQSxFQUFDLEtBQUssRUFBQyxFQUFDLENBQUEsRUFBQyxJQUFJLEVBQUMsRUFBQyxDQUFBLEVBQUMsR0FBQyxDQUFDLEFBQUM7UUFBQSxDQUFDLEdBQUMsRUFBQyxDQUFDLElBQUksRUFBQyxFQUFFLEdBQUMsQ0FBQyxHQUFDLEVBQUMsQ0FBQyxJQUFJLEVBQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsRUFBRSxJQUFFLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUFBLElBQUksRUFBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBQyxHQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsRUFBQyxHQUFDO1lBQUMsSUFBSSxFQUFDLENBQUM7WUFBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLEtBQUs7U0FBQyxBQUFDO1FBQUEsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUM7UUFBQSxJQUFJLElBQUksRUFBQyxHQUFDLEVBQUMsRUFBQyxFQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLElBQUUsQ0FBQyxDQUFDLEVBQUMsRUFBQyxFQUFFLENBQUM7WUFBQyxJQUFJLEVBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUMsQ0FBQyxBQUFDO1lBQUEsSUFBRyxFQUFDLENBQUMsS0FBSyxFQUFDO2dCQUFDLElBQUcsRUFBQyxRQUFRLEVBQUMsRUFBQyxDQUFBLEVBQUMsU0FBUyxFQUFDLEVBQUMsQ0FBQSxFQUFDLEdBQUMsRUFBQyxDQUFDLEtBQUssRUFBQyxFQUFDLEdBQUMsRUFBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsR0FBQyxFQUFDLEdBQUMsQ0FBQyxBQUFDO2dCQUFBLElBQUcsRUFBQyxLQUFHLEVBQUMsSUFBRSxFQUFDLEtBQUcsRUFBQyxFQUFDO29CQUFDLEVBQUMsR0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBQyxFQUFDLEVBQUMsRUFBQyxFQUFDLEVBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBQyxFQUFDLEVBQUMsRUFBQyxFQUFDLENBQUMsQ0FBQztvQkFBQSxTQUFTLENBQUMsQ0FBQTtpQkFBQztnQkFBQSxFQUFDLElBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFDLENBQUM7YUFBQztZQUFBLE9BQU8sRUFBQyxDQUFDLElBQUk7Z0JBQUUsS0FBSSxLQUFLO29CQUFDO3dCQUFDLElBQUksRUFBQyxFQUFDLEVBQUMsR0FBQyxFQUFDLENBQUMsSUFBSSxBQUFDO3dCQUFBLE9BQU8sRUFBQyxDQUFDLElBQUk7NEJBQUUsS0FBSyxDQUFDO2dDQUFDLEVBQUMsR0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUM7Z0NBQUEsTUFBTTs0QkFBQSxLQUFJLEdBQUcsQ0FBQzs0QkFBQSxLQUFJLEdBQUc7Z0NBQUMsRUFBQyxHQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7Z0NBQUEsTUFBTTs0QkFBQSxLQUFJLE9BQU87Z0NBQUMsRUFBQyxHQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUM7Z0NBQUEsTUFBTTs0QkFBQSxLQUFJLE9BQU87Z0NBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxJQUFHLEVBQUMsRUFBQztvQ0FBQyxJQUFJLEVBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEFBQUM7b0NBQUEsRUFBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsRUFBQyxFQUFDLEVBQUMsR0FBQyxDQUFDLEdBQUMsRUFBQyxDQUFDLEdBQUcsR0FBQyxFQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFDLEVBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxFQUFDLENBQUMsUUFBUSxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDO2lDQUFDLE1BQUssRUFBQyxJQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUMsRUFBQyxDQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEVBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQ0FBQSxFQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBRSxFQUFDLENBQUMsS0FBSyxDQUFDO3lCQUFDO3dCQUFBLE9BQU8sRUFBQyxDQUFDLEVBQUU7NEJBQUUsS0FBSyxDQUFDO2dDQUFDLEVBQUMsQ0FBQyxLQUFLLEdBQUMsRUFBQyxDQUFDO2dDQUFBLE1BQU07NEJBQUEsS0FBSSxHQUFHLENBQUM7NEJBQUEsS0FBSSxHQUFHO2dDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxDQUFDLEdBQUMsRUFBQyxDQUFDO2dDQUFBLE1BQU07NEJBQUEsS0FBSSxPQUFPO2dDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxFQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxHQUFDLEVBQUM7eUJBQUM7d0JBQUEsTUFBSztxQkFBQztnQkFBQSxLQUFJLFNBQVM7b0JBQUMsSUFBSSxFQUFDLEdBQUMsRUFBQyxDQUFDLElBQUksQUFBQztvQkFBQSxJQUFHLEVBQUMsQ0FBQyxFQUFFLEVBQUM7d0JBQUMsRUFBRSxHQUFDLE9BQU8sS0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxFQUFDLEVBQUUsR0FBQyxFQUFDLENBQUMsSUFBSSxDQUFDO3dCQUFBLElBQUksRUFBQyxHQUFDLEVBQUMsQ0FBQyxJQUFJLEdBQUMsQUFBQyxDQUFBLENBQUMsRUFBQyxFQUFDLENBQUMsRUFBRSxDQUFBLENBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFDLEVBQUMsQ0FBQyxLQUFLLEVBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUMsRUFBQyxFQUFDLENBQUMsRUFBRSxFQUFDLEVBQUMsQ0FBQyxBQUFDO3dCQUFBLEVBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxHQUFDLEVBQUMsQ0FBQyxLQUFLLEdBQUMsRUFBQyxFQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsT0FBTyxFQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsTUFBTTtxQkFBQzthQUFDO1lBQUEsQ0FBQyxHQUFDLEVBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQztTQUFDO1FBQUEsSUFBRyxDQUFDLENBQUMsRUFBQztZQUFDLElBQUksRUFBQyxHQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsQUFBQztZQUFBLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUEsQ0FBQyxHQUFFO2dCQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxFQUFDLEVBQUMsRUFBQyxFQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQzthQUFDLENBQUUsQ0FBQztZQUFBLElBQUksRUFBQyxHQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsQUFBQztZQUFBLElBQUcsRUFBQyxFQUFDO2dCQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsZUFBZSxDQUFDLElBQUUsRUFBRSxDQUFDLE9BQU8sRUFBQyxDQUFDLEVBQUMsRUFBQyxDQUFDLE9BQU8sRUFBQyxFQUFDLEVBQUMsRUFBQyxFQUFDLEVBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsYUFBYSxDQUFDLElBQUUsRUFBRSxDQUFDLE9BQU8sRUFBQyxDQUFDLEVBQUMsRUFBQyxDQUFDLFdBQVcsRUFBQyxFQUFDLEVBQUMsRUFBQyxFQUFDLEVBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsZUFBZSxDQUFDLElBQUUsRUFBRSxDQUFDLE9BQU8sRUFBQyxDQUFDLEVBQUMsRUFBQyxDQUFDLGlCQUFpQixFQUFDLEVBQUMsRUFBQyxFQUFDLEVBQUMsRUFBQyxDQUFDLENBQUM7Z0JBQUEsSUFBSSxFQUFDLEdBQUMsRUFBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEFBQUM7Z0JBQUEsRUFBQyxJQUFFLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQSxDQUFDLEdBQUU7b0JBQUMsRUFBRSxDQUFDLE9BQU8sRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEVBQUMsRUFBQyxFQUFDLEVBQUMsRUFBQyxDQUFDO2lCQUFDLENBQUU7YUFBQztTQUFDO0tBQUM7SUFBQSxFQUFFLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBQyxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztDQUFDO0FBQThNLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7SUFBQyxJQUFJLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQUFBQztJQUFBLElBQUcsQ0FBQyxFQUFDO1FBQUMsSUFBSSxFQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxBQUFDO0FBQUEsUUFBQSxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsR0FBQyxFQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsR0FBQyxFQUFDLENBQUMsUUFBUSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7WUFBQyxDQUFDO1NBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxHQUFDLEVBQUMsQ0FBQyxRQUFRLEdBQUMsR0FBRyxHQUFDLENBQUMsQ0FBQztLQUFDLE1BQUssQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxHQUFDLEVBQUUsR0FBQztRQUFDLENBQUM7S0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUM7SUFBQSxPQUFNO1FBQUMsU0FBUyxFQUFDLENBQUM7UUFBQyxRQUFRLEVBQUMsQ0FBQztRQUFDLElBQUksRUFBQyxDQUFDO0tBQUMsQ0FBQTtDQUFDO0FBQTRKLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxHQUFHLENBQUMsRUFBQztJQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsRUFBRSxBQUFDO0lBQUEsSUFBRyxDQUFDLEVBQUM7UUFBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxBQUFDO1FBQUEsSUFBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFJLENBQUMsQ0FBQyxDQUFBO0tBQUM7Q0FBQztBQUFBLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7SUFBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBSSxHQUFBLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsU0FBUyxDQUFDLEVBQUMsdUJBQXVCLEVBQUMsYUFBYSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLDhCQUE4QixFQUFDLHVCQUF1QixDQUFDLEVBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUc7WUFBQyxJQUFJLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxHQUFDLElBQUksQUFBQztZQUFBLElBQUcsQ0FBQyxFQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLFFBQVEsS0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUFBLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUFBLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxBQUFDO1lBQUEsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBO1NBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBRSxBQUFDO0lBQUEsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQztRQUFDLFFBQVEsRUFBQyxDQUFDLENBQUM7WUFBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLE9BQU8sRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztZQUFDLFFBQVEsRUFBQyxDQUFDO1NBQUMsQ0FBQztRQUFDLE1BQU0sRUFBQyxDQUFBLENBQUMsR0FBRSxDQUFDLENBQUMsQ0FBQztnQkFBQyxNQUFNLEVBQUMsQ0FBQztnQkFBQyxNQUFNLEVBQUMsQ0FBQztnQkFBQyxLQUFLLEVBQUMsRUFBRTthQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7UUFBQyxLQUFLLEVBQUMsQ0FBQSxDQUFDLEdBQUUsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7UUFBQyxHQUFHLEVBQUMsQ0FBQSxDQUFDLEdBQUUsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO2dCQUFDLEVBQUUsRUFBRTthQUFDLENBQUM7UUFBQyxNQUFNLEVBQUMsQ0FBQSxDQUFDLEdBQUUsRUFBRSxDQUFDLENBQUMsRUFBQyxRQUFRLEVBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQztnQkFBQyxFQUFFLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQzthQUFDLENBQUM7UUFBQyxTQUFTLEVBQUMsQ0FBQSxDQUFDLEdBQUUsRUFBRSxDQUFDLENBQUMsRUFBQyxXQUFXLEVBQUMsQ0FBQyxFQUFDO2dCQUFDLEVBQUUsRUFBRTtnQkFBQyxFQUFFLENBQUUsQ0FBQSxDQUFDLEdBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQUMsQ0FBQztRQUFDLE9BQU8sRUFBQyxDQUFDLEVBQUM7WUFBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsV0FBVyxHQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUM7Z0JBQUMsTUFBTSxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFBQyxDQUFDLEFBQUM7WUFBQSxPQUFPLENBQUMsQ0FBQyxjQUFjLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7Z0JBQUMsRUFBRSxFQUFFO2FBQUMsRUFBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUE7U0FBQztLQUFDLENBQUMsQ0FBQTtDQUFDO0FBQUEsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztJQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDO1FBQUMsS0FBSyxFQUFDLFNBQVM7UUFBQyxPQUFPLEVBQUMsQ0FBQztLQUFDLENBQUMsQUFBQztJQUFBLENBQUMsQ0FBQyxXQUFXLEVBQUMsQ0FBQyxDQUFDLENBQUM7SUFBQSxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsR0FBQztRQUFDLFdBQVcsRUFBQyxJQUFJLEdBQUc7UUFBQyxPQUFPLEVBQUMsQ0FBQztRQUFDLFlBQVksRUFBQyxDQUFDO1FBQUMsUUFBUSxFQUFDLENBQUM7UUFBQyxRQUFRLElBQUU7WUFBQyxJQUFJLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxBQUFDO1lBQUEsSUFBRyxFQUFFLEVBQUM7Z0JBQUMsSUFBSSxFQUFDLEdBQUMsRUFBRSxBQUFDO2dCQUFBLE1BQUssRUFBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDO2dCQUFBLEVBQUMsSUFBRSxDQUFDLENBQUMsR0FBQyxFQUFDLENBQUM7YUFBQztZQUFBLE9BQU0sQ0FBQyxDQUFDLElBQUUsRUFBRSxJQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUM7UUFBQyxRQUFRLEVBQUMsQ0FBQSxDQUFDLEdBQUUsQ0FBQyxDQUFDO2dCQUFDLE1BQU0sRUFBQyxDQUFDO2dCQUFDLE1BQU0sRUFBQyxDQUFDO2dCQUFDLEtBQUssRUFBQyxDQUFDO2dCQUFDLEtBQUssRUFBQyxFQUFFO2FBQUMsQ0FBQztRQUFDLEtBQUssRUFBQyxDQUFJLEdBQUEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUUsQ0FBRSxFQUFDLENBQUMsQ0FBQztRQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLEtBQUssRUFBQyxnQkFBZ0IsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsU0FBUyxDQUFDLEVBQUMsc0JBQXNCLEVBQUMsYUFBYSxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDO2dCQUFDLENBQUM7YUFBQyxFQUFFLENBQUEsQ0FBQyxHQUFFO2dCQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUFDLENBQUUsRUFBQyxDQUFDLENBQUM7UUFBQyxHQUFHLEVBQUMsQ0FBQyxFQUFDO1lBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQUFBQztZQUFBLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQTtTQUFDO1FBQUMsR0FBRyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7WUFBQyxJQUFJLENBQUMsRUFBQyxDQUFDLEFBQUM7WUFBQSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyw4QkFBOEIsRUFBQyxjQUFjLENBQUMsQ0FBQztZQUFBLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQUFBQztZQUFBLEVBQUUsRUFBRSxHQUFDLENBQUMsR0FBQyxJQUFJLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUFBLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7Z0JBQUMsSUFBSSxFQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQztnQkFBQyxPQUFPLEVBQUMsQ0FBQztnQkFBQyxHQUFHLEVBQUMsQ0FBQzthQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQUFBQztZQUFBLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQztnQkFBQyxJQUFJLEVBQUMsQ0FBQztnQkFBQyxFQUFFLEVBQUMsQ0FBQztnQkFBQyxJQUFJLEVBQUMsQ0FBQzthQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsVUFBVSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUE7U0FBQztRQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO1lBQUMsSUFBRyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQztnQkFBQyxJQUFJLEVBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxBQUFDO2dCQUFBLE9BQU8sQ0FBQyxDQUFDLFlBQVksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFDLEVBQUMsQ0FBQTthQUFDO1lBQUEsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLHNDQUFzQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBRSxDQUFBLENBQUMsR0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFFLENBQUE7U0FBQztLQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFlBQVksQUFBQztJQUFBLENBQUMsQ0FBQyxRQUFRLEdBQUMsQ0FBQyxDQUFDO1FBQUMsS0FBSyxFQUFDO1lBQUMsS0FBSyxFQUFDLENBQUM7WUFBQyxFQUFFLEVBQUMsQ0FBQztTQUFDO1FBQUMsSUFBSSxFQUFDO1lBQUMsRUFBRSxDQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBRTtZQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFBQyxFQUFFLENBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsRUFBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFBQyxDQUFDLElBQUUsRUFBRSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7WUFBQyxFQUFFLENBQUM7Z0JBQUMsSUFBSSxFQUFDLENBQUM7Z0JBQUMsTUFBTSxFQUFDLENBQUM7YUFBQyxDQUFDO1NBQUM7UUFBQyxLQUFLLEVBQUMsQ0FBQztRQUFDLElBQUksRUFBQyxDQUFDO1FBQUMsUUFBUSxFQUFDLENBQUM7S0FBQyxDQUFDLENBQUM7SUFBQSxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLFNBQVMsQ0FBQyxFQUFDLENBQUMsR0FBQyxRQUFRLEtBQUcsRUFBRSxDQUFDLENBQUMsRUFBQyxXQUFXLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsQUFBQztJQUFBLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUMsYUFBYSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLElBQUUsRUFBRSxDQUFDLENBQUMsRUFBQyxlQUFlLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxvREFBb0QsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUM7UUFBQyxDQUFDO0tBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQTtDQUFDO0FBQWtVLFNBQVMsQ0FBQyxHQUFFO0lBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxBQUFDO0lBQUEsT0FBTyxDQUFDLENBQUMsR0FBRyxHQUFDLElBQUksT0FBTyxDQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRztRQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQztLQUFDLENBQUUsRUFBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBRSxJQUFJLEVBQUUsQ0FBRSxFQUFDLENBQUMsQ0FBQTtDQUFDO0FBQUEsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztJQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUM7UUFBQyxPQUFPLEVBQUMsQ0FBQztLQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEFBQUM7SUFBQSxFQUFFLENBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLFFBQVEsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsQ0FBQSxDQUFDLEdBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLG9DQUFvQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxHQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7SUFBQSxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQztRQUFDLEtBQUssRUFBQyxTQUFTO1FBQUMsT0FBTyxFQUFDLENBQUM7S0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUFDLEtBQUssRUFBQyxNQUFNO1FBQUMsRUFBRSxFQUFDLEVBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQSxFQUFDLE1BQU0sRUFBQyxDQUFDLENBQUEsRUFBQyxNQUFNLEVBQUMsQ0FBQyxDQUFBLEVBQUMsRUFBQztZQUFDLElBQUcsTUFBTSxLQUFHLENBQUMsRUFBQyxPQUFNO2dCQUFDLE1BQU0sRUFBQyxDQUFDO2dCQUFDLE1BQU0sRUFBQyxDQUFDO2FBQUMsQ0FBQTtTQUFDO0tBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFBQyxLQUFLLEVBQUMsTUFBTTtRQUFDLEVBQUUsRUFBQyxFQUFDLE1BQU0sRUFBQyxDQUFDLENBQUEsRUFBQyxNQUFNLEVBQUMsQ0FBQyxDQUFBLEVBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQSxFQUFDLEVBQUM7WUFBQyxJQUFHLE1BQU0sS0FBRyxDQUFDLEVBQUMsT0FBTTtnQkFBQyxNQUFNLEVBQUMsQ0FBQztnQkFBQyxLQUFLLEVBQUMsQ0FBQzthQUFDLENBQUE7U0FBQztLQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1FBQUMsS0FBSyxFQUFDLFVBQVU7UUFBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLE1BQU0sRUFBQyxDQUFDLENBQUEsRUFBQyxHQUFHLENBQUM7S0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUFDLEtBQUssRUFBQyxVQUFVO1FBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxDQUFBLEVBQUMsR0FBRyxDQUFDO0tBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUM7UUFBQyxLQUFLLEVBQUM7WUFBQyxTQUFTLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUM7WUFBQyxPQUFPLEVBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLElBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FBQztRQUFDLElBQUksRUFBQztZQUFDLEVBQUUsQ0FBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFHO2dCQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQUFBQztnQkFBQSxJQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQztvQkFBQyxJQUFJLEVBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQUFBQztvQkFBQSxFQUFDLElBQUUsQ0FBQyxDQUFDLEdBQUMsRUFBQyxDQUFDO2lCQUFDO2dCQUFBLE9BQU8sQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBO2FBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDO1lBQUMsRUFBRSxDQUFFLENBQUMsRUFBQyxNQUFNLEVBQUMsQ0FBQyxDQUFBLEVBQUMsR0FBRyxFQUFDLENBQUMsQ0FBQSxFQUFDLE9BQU8sRUFBQyxDQUFDLENBQUEsRUFBQyxJQUFJLEVBQUMsQ0FBQyxHQUFDO2dCQUFDLENBQUM7YUFBQyxDQUFBLEVBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFHO2dCQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEFBQUM7Z0JBQUEsQ0FBQyxJQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDO1NBQUM7UUFBQyxJQUFJLEVBQUM7WUFBQyxFQUFFLEVBQUMsSUFBSTtZQUFDLEVBQUUsRUFBQyxRQUFRO1NBQUM7S0FBQyxDQUFDLEFBQUM7SUFBQSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUMsRUFBRSxDQUFFLENBQUMsQ0FBQyxFQUFDLEVBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQSxFQUFDLEVBQUMsQ0FBQyxHQUFHO1FBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDO1lBQUMsTUFBTSxFQUFDLENBQUM7WUFBQyxHQUFHLEVBQUM7Z0JBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxFQUFFO2dCQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsRUFBRTthQUFDO1NBQUMsR0FBQyxDQUFDLEFBQUM7UUFBQSxPQUFPLENBQUMsQ0FBQztZQUFDLE1BQU0sRUFBQyxDQUFDO1lBQUMsTUFBTSxFQUFDLENBQUM7WUFBQyxLQUFLLEVBQUMsQ0FBQztZQUFDLEtBQUssRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7S0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQSxDQUFDLEdBQUU7UUFBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUM7WUFBQyxNQUFNLEVBQUMsQ0FBQztZQUFDLEdBQUcsRUFBQyxDQUFDO1NBQUMsQUFBQztRQUFBLElBQUcsRUFBRSxFQUFDO1lBQUMsSUFBRyxDQUFDLEVBQUUsRUFBQztnQkFBQyxJQUFJLEVBQUMsR0FBQyxFQUFFLEFBQUM7Z0JBQUEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUUsSUFBSTtvQkFBQyxFQUFFLENBQUMsRUFBQyxDQUFDO2lCQUFDLENBQUUsQ0FBQyxLQUFLLENBQUUsSUFBSSxFQUFFLENBQUU7YUFBQztZQUFBLENBQUMsQ0FBQztnQkFBQyxNQUFNLEVBQUMsQ0FBQztnQkFBQyxNQUFNLEVBQUMsQ0FBQztnQkFBQyxLQUFLLEVBQUMsRUFBRTthQUFDLENBQUM7U0FBQyxNQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQSxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUE7S0FBQyxDQUFDO0lBQUEsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO1FBQUMsU0FBUyxFQUFDLFFBQVE7S0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFBLENBQUMsR0FBRSxDQUFDLEdBQUMsQ0FBQyxDQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFBLENBQUMsR0FBRSxDQUFDLEdBQUMsQ0FBQyxDQUFFLENBQUMsR0FBRyxDQUFDO1FBQUMsRUFBRSxFQUFDLENBQUEsQ0FBQyxHQUFFLENBQUM7UUFBQyxLQUFLLEVBQUMsVUFBVTtLQUFDLENBQUMsQUFBQztJQUFBLEVBQUUsQ0FBQyxDQUFDLEVBQUMsZUFBZSxFQUFDLEtBQUssQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsZUFBZSxFQUFDLENBQUMsQ0FBQyxDQUFDO0lBQUEsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1FBQUMsRUFBRSxFQUFDLENBQUEsQ0FBQyxHQUFFLENBQUMsR0FBQyxDQUFDO1FBQUMsS0FBSyxFQUFDLFNBQVM7S0FBQyxDQUFDLEFBQUM7SUFBQSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUM7UUFBQyxDQUFDO1FBQUMsQ0FBQztRQUFDLENBQUM7UUFBQyxDQUFDO1FBQUMsQ0FBQztRQUFDLENBQUM7UUFBQyxDQUFDO0tBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQTtDQUFDO0FBQTZzQixTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0lBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDO1FBQUMsTUFBTSxFQUFDO1lBQUMsSUFBSSxFQUFDLFFBQVE7U0FBQztRQUFDLFFBQVEsRUFBQyxDQUFDO0tBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQztRQUFDLE9BQU8sRUFBQyxFQUFFO1FBQUMsUUFBUSxFQUFDLENBQUM7UUFBQyxLQUFLLEVBQUMsRUFBRTtLQUFDLEFBQUM7SUFBQSxDQUFDLENBQUMsSUFBSSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7UUFBQyxLQUFLLEVBQUMsQ0FBQztRQUFDLE1BQU0sRUFBQyxDQUFDO1FBQUMsS0FBSyxFQUFDLENBQUM7UUFBQyxNQUFNLEVBQUMsQ0FBQztLQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFHO1FBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUM7WUFBQyxLQUFLLEVBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FBQyxDQUFDLEFBQUM7UUFBQSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQztRQUFBLElBQUksQ0FBQyxHQUFDLElBQUksR0FBRyxBQUFDO1FBQUEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQSxDQUFDLEdBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFDLEVBQUUsQ0FBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUUsQ0FBQSxDQUFDLEdBQUU7WUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFDO2dCQUFDLENBQUM7YUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsUUFBUSxJQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQztTQUFDLENBQUUsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFDO1lBQUMsQ0FBQztTQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUEsQ0FBQyxHQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO2dCQUFDLE1BQU0sRUFBQyxDQUFDO2dCQUFDLEVBQUUsRUFBQyxDQUFDO2FBQUMsQ0FBQyxDQUFDO0tBQUMsQ0FBRSxDQUFDO0lBQUEsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxBQUFDO0lBQUEsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBQyxDQUFBO0NBQUM7QUFBOG9MLElBQUksQ0FBQyxHQUFDLFdBQVcsSUFBRSxPQUFPLE1BQU0sSUFBRSxNQUFNLENBQUMsVUFBVSxJQUFFLGNBQWMsRUFBQyxDQUFDLEdBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxPQUFPLEVBQUMsQ0FBQyxHQUFDLENBQUEsQ0FBQyxHQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLE1BQU0sSUFBRyxDQUFDLEFBQUM7QUFBQSxNQUFNLENBQUMsR0FBQyxDQUFBLENBQUMsR0FBRSxDQUFBLENBQUMsR0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUksS0FBRyxDQUFDLEFBQUM7QUFBQSxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQUFBQztBQUF3RSxJQUEyQixDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFHO0lBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQUFBQztJQUFBLENBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7Q0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUMsR0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFBLENBQUMsR0FBRSxDQUFDLENBQUMsUUFBUSxJQUFFLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQSxDQUFDLEdBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUEsQ0FBQyxHQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFDLEVBQUUsR0FBQyxDQUFBLENBQUMsR0FBRSxDQUFDLENBQUMsUUFBUSxFQUFDLEVBQUUsR0FBQyxDQUFBLENBQUMsR0FBRSxDQUFDLENBQUMsS0FBSyxFQUFDLEVBQUUsR0FBQyxDQUFBLENBQUMsR0FBRSxDQUFDLENBQUMsV0FBVyxFQUFDLEVBQUUsR0FBQyxDQUFBLENBQUMsR0FBRSxDQUFDLENBQUMsTUFBTSxFQUFDLEVBQUUsR0FBQyxDQUFBLENBQUMsR0FBRSxDQUFDLENBQUMsS0FBSyxFQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxFQUFFLEdBQUMsQ0FBQSxDQUFDLEdBQUUsQ0FBQyxDQUFDLGFBQWEsQUFBQztBQUFBLE1BQU0sRUFBRSxHQUFDLElBQUk7SUFBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEFBQUM7SUFBQSxPQUFNLElBQUksRUFBRSxHQUFFLEVBQUUsQ0FBQyxDQUFBO0NBQUMsQUFBQztBQUFBLElBQUksRUFBRSxHQUFDLEVBQUUsRUFBRSxFQUFDLEVBQUUsR0FBQyxFQUFFLEVBQUUsRUFBQyxFQUFFLEdBQUMsRUFBRSxFQUFFLEVBQUMsRUFBRSxHQUFDLElBQUksRUFBQyxFQUFFLEdBQUMsSUFBSSxFQUFFLElBQUUsRUFBRSxDQUFDLFFBQVEsRUFBQyxFQUFFLEdBQUMsQ0FBQSxDQUFDLEdBQUUsQ0FBQyxDQUFDLElBQUUsRUFBRSxJQUFFLEVBQUUsQ0FBQyxPQUFPLElBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBK0YsRUFBRSxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRztJQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQUFBQztJQUFBLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQSxDQUFDLEdBQUU7UUFBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEFBQUM7UUFBQSxRQUFRLEtBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksR0FBQyxXQUFXLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO0tBQUMsQ0FBRTtDQUFDLEVBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDO1FBQUMsQ0FBQztLQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxHQUFDLENBQUEsQ0FBQyxHQUFFLFFBQVEsSUFBRSxPQUFPLENBQUMsSUFBRSxJQUFJLEtBQUcsQ0FBQyxFQUFDLEVBQUUsR0FBQyxDQUFBLENBQUMsR0FBRSxVQUFVLElBQUUsT0FBTyxDQUFDLEVBQUMsRUFBRSxHQUFDLENBQUEsQ0FBQyxHQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsRUFBQyxFQUFFLEdBQUMsQ0FBQSxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsb0NBQW9DLENBQUMsQUFBQztBQUFBLE1BQU0sRUFBRSxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLFFBQVEsSUFBRyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsVUFBVSxJQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLHNDQUFzQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQUFBQztBQUFBLElBQUksRUFBRSxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUc7SUFBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsb0JBQW9CLENBQUM7Q0FBQyxFQUFpSCxFQUFFLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBQyxFQUFFLEVBQUMsQ0FBQyxDQUFBLEVBQUMsRUFBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsRUFBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQSxFQUFDLEVBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLEVBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFDLEVBQUUsRUFBQyxDQUFDLENBQUEsRUFBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQUFBQztBQUFBLE1BQU0sRUFBRSxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFHO0lBQUMsSUFBSSxDQUFDLEdBQUM7UUFBQyxFQUFFLEVBQUMsRUFBRSxFQUFFO1FBQUMsSUFBSSxFQUFDLENBQUM7UUFBQyxJQUFJLEVBQUMsQ0FBQztLQUFDLEFBQUM7SUFBQSxPQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUM7UUFBQyxRQUFRLEVBQUMsQ0FBQztLQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQTtDQUFDLEFBQUM7QUFBQSxJQUFJLEVBQUUsR0FBQyxDQUFDLEVBQUMsRUFBRSxHQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsQ0FBQyxHQUFDLE9BQU8sQ0FBQSxFQUFDLEtBQUssRUFBQyxDQUFDLENBQUEsRUFBQyxNQUFNLEVBQUMsQ0FBQyxDQUFBLEVBQUMsRUFBRSxFQUFDLENBQUMsR0FBRSxDQUFDLEdBQUMsT0FBTyxHQUFDLENBQUMsQUFBQyxDQUFBLEVBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQSxFQUFDLFFBQVEsRUFBQyxDQUFDLENBQUEsRUFBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUM7UUFBQyxJQUFJLEVBQUMsQ0FBQztRQUFDLEtBQUssRUFBQyxDQUFDO1FBQUMsRUFBRSxFQUFDLENBQUM7UUFBQyxNQUFNLEVBQUMsQ0FBQztLQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsR0FBQyxDQUFDLEVBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQSxFQUFDLEtBQUssRUFBQyxDQUFDLENBQUEsRUFBQyxRQUFRLEVBQUMsQ0FBQyxDQUFBLEVBQUMsSUFBSSxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsRUFBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxFQUFDLElBQUksRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEVBQUMsR0FBRyxFQUFFLENBQUMsU0FBUyxFQUFDO1FBQUMsRUFBRSxFQUFDLENBQUM7UUFBQyxJQUFJLEVBQUMsQ0FBQztRQUFDLE1BQU0sRUFBQyxDQUFDO1FBQUMsSUFBSSxFQUFDLENBQUM7S0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLEdBQUMsQ0FBQyxFQUFDLEVBQUUsRUFBQyxDQUFDLENBQUEsRUFBQyxHQUFHLEVBQUUsQ0FBQztRQUFDLEVBQUUsRUFBQyxDQUFDO1FBQUMsUUFBUSxFQUFDLFFBQVE7S0FBQyxDQUFDLEVBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQUMsRUFBRSxFQUFDLENBQUM7UUFBQyxJQUFJLEVBQUMsQ0FBQztRQUFDLE1BQU0sRUFBQyxDQUFDO1FBQUMsUUFBUSxFQUFDLENBQUMsSUFBRSxRQUFRO0tBQUMsQ0FBQyxFQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUFDLEtBQUssRUFBQyxDQUFDO1FBQUMsRUFBRSxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsR0FBRztRQUFDLFFBQVEsRUFBQyxDQUFDLElBQUUsU0FBUztRQUFDLEtBQUssRUFBQyxDQUFDO0tBQUMsQ0FBQyxFQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUFDLEVBQUUsRUFBQyxDQUFDO1FBQUMsSUFBSSxFQUFDLENBQUM7UUFBQyxNQUFNLEVBQUMsQ0FBQztLQUFDLENBQUMsRUFBa0YsRUFBRSxHQUFDLENBQUEsQ0FBQyxHQUFFLENBQUM7UUFBQyxFQUFFLEVBQUMsRUFBRSxFQUFFO1FBQUMsT0FBTyxFQUFDLENBQUM7S0FBQyxDQUFDLEVBQUMsRUFBRSxHQUFDLENBQUMsRUFBQyxPQUFPLEVBQUMsQ0FBQyxDQUFBLEVBQUMsR0FBRyxDQUFDLEVBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRztJQUFDLENBQUMsQ0FBQyxNQUFNLElBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQztDQUFDLEVBQUMsRUFBRSxHQUFDLElBQUksQUFBQztBQUFBLE1BQU0sRUFBRSxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRztJQUFDLElBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUM7SUFBQSxJQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQUEsSUFBSSxDQUFDLEFBQUM7SUFBQSxPQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUE7Q0FBQyxFQUFDLEVBQUUsR0FBQyxFQUFFLEFBQUM7QUFBQSxJQUFJLEVBQUUsR0FBQyxDQUFDLEFBQUM7QUFBQSxNQUFLLEVBQUUsR0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBQztJQUFDLEtBQUssRUFBQyxJQUFJO0lBQUMsSUFBSSxFQUFDLElBQUk7SUFBQyxJQUFJLEVBQUMsQ0FBQztDQUFDLENBQUMsRUFBQyxFQUFFLElBQUUsQ0FBQyxDQUFDO0FBQUEsTUFBTSxFQUFFLEdBQUMsSUFBSTtJQUFDLElBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLENBQUM7UUFBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEFBQUM7UUFBQSxJQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDO1lBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLEVBQUM7Z0JBQUMsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLENBQUM7Z0JBQUEsSUFBSSxFQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQUFBQztnQkFBQSxPQUFPLEVBQUUsR0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBQyxDQUFBO2FBQUM7QUFBQSxZQUFBLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxJQUFJLENBQUMsQ0FBQztZQUFBLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEFBQUM7WUFBQSxPQUFPLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUM7S0FBQztDQUFDLEVBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBQztRQUFDLENBQUMsRUFBQyxJQUFJO1FBQUMsQ0FBQyxFQUFDLElBQUk7UUFBQyxJQUFJLEVBQUMsQ0FBQztRQUFDLE1BQU0sRUFBQyxDQUFDO1FBQUMsS0FBSyxFQUFDLENBQUM7UUFBQyxJQUFJLEVBQUMsQ0FBQztRQUFDLEtBQUssRUFBQyxDQUFDO0tBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFHO0lBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDO1FBQUMsQ0FBQyxFQUFDO1lBQUMsR0FBRyxFQUFDLENBQUM7WUFBQyxLQUFLLEVBQUMsQ0FBQztZQUFDLElBQUksRUFBQyxDQUFDO1lBQUMsRUFBRSxFQUFDLENBQUM7U0FBQztRQUFDLENBQUMsRUFBQyxJQUFJO1FBQUMsQ0FBQyxFQUFDLElBQUk7S0FBQyxBQUFDO0FBQUEsSUFBQSxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUM7Q0FBQyxFQUFDLEVBQUUsR0FBQyxDQUFBLENBQUMsR0FBRTtJQUFDLE9BQU8sQ0FBQztRQUFFLEtBQUksT0FBTztZQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQUEsS0FBSSxNQUFNO1lBQUMsT0FBTyxDQUFDLENBQUM7UUFBQSxLQUFJLE1BQU07WUFBQyxPQUFPLENBQUMsQ0FBQztRQUFBLEtBQUksU0FBUztZQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQUEsS0FBSSxTQUFTO1lBQUMsT0FBTyxDQUFDLENBQUM7UUFBQSxLQUFJLFFBQVE7WUFBQyxPQUFPLENBQUMsQ0FBQztRQUFBO1lBQVEsT0FBTSxDQUFDLENBQUMsQ0FBQTtLQUFDO0NBQUMsRUFBQyxFQUFFLEdBQUMsSUFBSSxHQUFHLEFBQUM7QUFBQSxJQUFJLEVBQUUsRUFBQyxFQUFFLEdBQUMsQ0FBQyxFQUFDLEVBQUUsR0FBQyxDQUFDLEVBQUMsRUFBRSxHQUFDLENBQUMsRUFBQyxFQUFFLEdBQUMsSUFBSSxFQUFDLEVBQUUsR0FBQyxDQUFBLENBQUMsR0FBRTtJQUFDLEVBQUUsR0FBQyxDQUFDO0NBQUMsRUFBQyxFQUFFLEdBQUMsQ0FBQSxDQUFDLEdBQUU7SUFBQyxFQUFFLEdBQUMsQ0FBQztDQUFDLEFBQUM7QUFBQSxNQUFNLEVBQUUsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUc7SUFBQyxJQUFHLENBQUMsRUFBQztRQUFDLE1BQUssQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUEsSUFBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUE7S0FBQztJQUFBLE9BQU8sSUFBSSxDQUFBO0NBQUMsQUFBQztBQUFBLElBQUksRUFBRSxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRztJQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxBQUFDO0lBQUEsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7Q0FBQyxFQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUc7SUFBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxBQUFDO0lBQUEsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE9BQU87SUFBQSxJQUFJLENBQUMsR0FBQztRQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBRTtRQUFDLE9BQU8sRUFBQyxDQUFDLENBQUMsT0FBTztLQUFDLEFBQUM7SUFBQSxJQUFHLENBQUMsSUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksSUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FBSyxJQUFHLENBQUMsQ0FBQyxNQUFNLElBQUUsQ0FBQyxDQUFDLEVBQUM7UUFBQyxJQUFJLEVBQUMsR0FBQyxDQUFDLEVBQUMsRUFBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUUsQ0FBQyxBQUFDO1FBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQSxDQUFDLEdBQUU7WUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJO2dCQUFFLEtBQUssQ0FBQztvQkFBQzt3QkFBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxBQUFDO3dCQUFBLElBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUM7NEJBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQzs0QkFBQSxJQUFJLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLEFBQUM7NEJBQUEsRUFBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDO3lCQUFDO3dCQUFBLE1BQUs7cUJBQUM7Z0JBQUEsS0FBSSxPQUFPO29CQUFDLEVBQUMsSUFBRSxDQUFDLEVBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBQzsyQkFBSSxDQUFDLENBQUMsT0FBTztxQkFBQyxHQUFDO3dCQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU87cUJBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQzthQUFDO1NBQUMsQ0FBRTtLQUFDO0lBQUEsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDO0NBQUMsQUFBQztBQUFBLE1BQU0sRUFBRSxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUc7SUFBQyxJQUFHO1FBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBLE9BQU0sRUFBQyxFQUFDO1FBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUM7S0FBQztDQUFDLEFBQUM7QUFBQSxJQUFJLEVBQUUsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUc7UUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUUsSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQztLQUFDLENBQUUsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxBQUFDO0FBQUEsTUFBTSxFQUFFLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFHO0lBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztDQUFDLEVBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUc7SUFBQyxJQUFJLENBQUMsQUFBQztJQUFBLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxJQUFJLENBQUM7SUFBQSxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEFBQUM7SUFBQSxNQUFLLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsUUFBUSxLQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUUsV0FBVyxLQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUUsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxLQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUM7SUFBQSxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxXQUFXLEtBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUUsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxLQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUUsQ0FBQyxDQUFDO0NBQUMsRUFBQyxFQUFFLEdBQUMsQ0FBQSxDQUFDLEdBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxBQUFDO0FBQUEsSUFBSSxFQUFFLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBQyxJQUFJLEVBQUMsQ0FBQyxDQUFBLEVBQUMsR0FBQyxFQUFFLEdBQUc7SUFBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEFBQUM7SUFBQSxJQUFHLENBQUMsQ0FBQyxRQUFRLElBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUFLLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQztRQUFBLElBQUksRUFBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLEFBQUM7UUFBQSxFQUFFLENBQUMsRUFBQyxDQUFDLE1BQU0sQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsT0FBTyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxNQUFNLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBQyxDQUFDLE9BQU8sQ0FBQztLQUFDO0lBQUEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztDQUFDLEVBQUMsRUFBRSxHQUFDLENBQUEsQ0FBQyxHQUFFO0lBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEFBQUM7SUFBQSxPQUFPLENBQUMsQ0FBQyxXQUFXLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQTtDQUFDLEVBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFBQyxJQUFJLEVBQUMsQ0FBQztRQUFDLE1BQU0sRUFBQyxDQUFDO1FBQUMsS0FBSyxFQUFDLENBQUM7UUFBQyxLQUFLLEVBQUM7WUFBQyxFQUFFLEVBQUMsQ0FBQztTQUFDO1FBQUMsSUFBSSxFQUFDO1lBQUMsRUFBRSxFQUFDLENBQUM7U0FBQztRQUFDLE1BQU0sRUFBQztZQUFDLE1BQU0sRUFBQztnQkFBQyxDQUFDO2dCQUFDLENBQUM7YUFBQztZQUFDLEtBQUssRUFBQyxDQUFDO1NBQUM7UUFBQyxRQUFRLEVBQUMsQ0FBQztLQUFDLENBQUMsRUFBMEssRUFBRSxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsc0NBQXNDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQUMsS0FBSyxFQUFDO1lBQUMsRUFBRSxFQUFDLENBQUM7U0FBQztRQUFDLElBQUksRUFBQztZQUFDLEVBQUUsQ0FBQztnQkFBQyxFQUFFLEVBQUMsRUFBRTthQUFDLENBQUM7U0FBQztRQUFDLE1BQU0sRUFBQyxDQUFDO1FBQUMsSUFBSSxFQUFDO1lBQUMsRUFBRSxFQUFDLE9BQU87U0FBQztRQUFDLE1BQU0sRUFBQztZQUFDLE1BQU0sRUFBQyxDQUFDO1NBQUM7UUFBQyxRQUFRLEVBQUMsQ0FBQztLQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsT0FBTyxHQUFHO0lBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQUMsRUFBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUc7SUFBQyxJQUFJLENBQUMsR0FBQyxRQUFRLEtBQUcsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUUsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDO1FBQUMsRUFBRSxFQUFDLENBQUM7UUFBQyxHQUFHLEVBQUMsUUFBUSxJQUFFLE9BQU8sQ0FBQyxHQUFDO1lBQUMsSUFBSSxFQUFDLENBQUM7U0FBQyxHQUFDLENBQUM7S0FBQyxDQUFDLEVBQUMsRUFBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQSxFQUFDLEdBQUcsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFBLEVBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUEsRUFBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLEdBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQztRQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUM7UUFBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDO1FBQUMsR0FBRyxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUFDLEtBQUssRUFBQyxDQUFDO1FBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQztRQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsU0FBUztRQUFDLE9BQU8sRUFBQyxDQUFDLENBQUMsT0FBTztRQUFDLE1BQU0sRUFBQyxDQUFDO0tBQUMsQUFBQztJQUFBLElBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLGFBQWEsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLGFBQWEsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFBLENBQUMsR0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxFQUFDLFNBQVMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFDLENBQUMsQ0FBQyxFQUFDO1FBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFBLENBQUMsR0FBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQSxDQUFDLEdBQUUsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUM7UUFBQSxJQUFJLEVBQUMsR0FBQyxFQUFFLEVBQUUsQUFBQztRQUFBLEVBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxjQUFjLEdBQUMsRUFBQyxDQUFDO0tBQUM7SUFBQSxPQUFPLENBQUMsQ0FBQTtDQUFDLEFBQUM7QUFBQSxNQUFNLEVBQUUsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRztJQUFDLElBQUksQ0FBQyxBQUFDO0lBQUEsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQUEsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDO1FBQUMsSUFBSSxFQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQztRQUFDLE9BQU8sRUFBQyxDQUFDO1FBQUMsR0FBRyxFQUFDLENBQUM7S0FBQyxDQUFDLEFBQUM7SUFBQSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBO0NBQUMsRUFBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFHO0lBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUM7UUFBQyxLQUFLLEVBQUMsQ0FBQztRQUFDLEVBQUUsRUFBQyxHQUFHO1FBQUMsUUFBUSxFQUFDLE1BQU07S0FBQyxDQUFDLEFBQUM7SUFBQSxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUMsQ0FBQyxDQUFDLENBQUM7SUFBQSxJQUFJLENBQUMsR0FBQztRQUFDLENBQUM7UUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQUMsQUFBQztJQUFBLE9BQU8sQ0FBQyxDQUFDLFlBQVksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0NBQUMsQUFBMjVCO0FBQUEsSUFBSSxFQUFFLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRztJQUFDLElBQUc7UUFBQyxPQUFNO0FBQUMsYUFBQztZQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7U0FBQyxDQUFBO0tBQUMsQ0FBQSxPQUFNLEVBQUMsRUFBQztRQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBQztZQUFDLElBQUk7U0FBQyxDQUFBO0tBQUM7Q0FBQyxFQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFD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
