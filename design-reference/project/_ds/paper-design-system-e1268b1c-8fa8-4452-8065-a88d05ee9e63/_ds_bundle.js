/* @ds-bundle: {"format":3,"namespace":"FolioDesignSystem_e1268b","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Callout","sourcePath":"components/core/Callout.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Eyebrow","sourcePath":"components/core/Eyebrow.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"0e5a7c7b2159","components/core/Button.jsx":"3d9f15fa7c38","components/core/Callout.jsx":"a55a53e6a3e0","components/core/Card.jsx":"8d8e2d907a93","components/core/Eyebrow.jsx":"e81cd1e7d1b1","components/core/Input.jsx":"b7bf8c9859f8","ui_kits/folio_app/LibraryScreen.jsx":"b545c94dbf34","ui_kits/folio_app/ReaderScreen.jsx":"6ff124665773","ui_kits/folio_app/Sidebar.jsx":"ea2def33c57d"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.FolioDesignSystem_e1268b = window.FolioDesignSystem_e1268b || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Folio Badge / Tag — small status or category marker.
 * variant: "teal" | "clay" | "neutral" | "outline". size: "sm" | "md".
 */
function Badge({
  variant = "neutral",
  size = "sm",
  children,
  style,
  ...rest
}) {
  const variants = {
    teal: {
      background: "var(--teal-soft)",
      color: "var(--teal)",
      border: "1px solid transparent"
    },
    clay: {
      background: "var(--clay-soft)",
      color: "var(--clay)",
      border: "1px solid transparent"
    },
    neutral: {
      background: "var(--surface-sunken)",
      color: "var(--text-muted)",
      border: "1px solid var(--border-subtle)"
    },
    outline: {
      background: "transparent",
      color: "var(--text-muted)",
      border: "1px solid var(--border-strong)"
    }
  };
  const v = variants[variant] || variants.neutral;
  const dims = size === "md" ? {
    fontSize: "0.75rem",
    padding: "4px 11px"
  } : {
    fontSize: "0.6875rem",
    padding: "3px 9px"
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      fontFamily: "var(--font-mono)",
      fontWeight: "var(--weight-medium)",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      borderRadius: "var(--radius-pill)",
      whiteSpace: "nowrap",
      ...dims,
      ...v,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Folio Button — editorial, restrained. Teal primary, clay secondary,
 * quiet ghost. Sizes sm/md/lg. Styling driven by Folio CSS tokens.
 */
function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  fullWidth = false,
  type = "button",
  onClick,
  children,
  style,
  ...rest
}) {
  const sizes = {
    sm: {
      fontSize: "0.8125rem",
      padding: "7px 14px",
      radius: "8px"
    },
    md: {
      fontSize: "0.9375rem",
      padding: "10px 20px",
      radius: "10px"
    },
    lg: {
      fontSize: "1.03125rem",
      padding: "13px 26px",
      radius: "12px"
    }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      background: "var(--action-primary)",
      color: "var(--on-ink)",
      border: "1px solid transparent"
    },
    secondary: {
      background: "var(--action-secondary)",
      color: "var(--on-ink)",
      border: "1px solid transparent"
    },
    outline: {
      background: "transparent",
      color: "var(--text-strong)",
      border: "1px solid var(--border-strong)"
    },
    ghost: {
      background: "transparent",
      color: "var(--text-accent)",
      border: "1px solid transparent"
    }
  };
  const v = variants[variant] || variants.primary;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      width: fullWidth ? "100%" : "auto",
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-medium)",
      letterSpacing: "-0.005em",
      fontSize: s.fontSize,
      padding: s.padding,
      borderRadius: s.radius,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: "background var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)",
      ...v,
      ...style
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "translateY(1px)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "none";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "none";
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Folio Card — raised paper surface with hairline border and optional
 * left accent rule. tone: "paper" (default), "accent" (teal-soft),
 * "invert" (dark ink). accent prop adds the 3px teal left rule.
 */
function Card({
  tone = "paper",
  accent = false,
  padding = "var(--space-6)",
  children,
  style,
  ...rest
}) {
  const tones = {
    paper: {
      background: "var(--surface-card)",
      color: "var(--text-body)",
      border: "1px solid var(--border-strong)"
    },
    accent: {
      background: "var(--surface-accent)",
      color: "var(--text-body)",
      border: "1px solid transparent"
    },
    invert: {
      background: "var(--surface-invert)",
      color: "var(--text-invert)",
      border: "1px solid transparent"
    }
  };
  const t = tones[tone] || tones.paper;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      borderRadius: "var(--radius-md)",
      padding,
      ...t,
      ...(accent ? {
        borderLeft: "var(--border-accent) solid var(--teal)"
      } : {}),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Eyebrow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Folio Eyebrow — the mono, uppercase, letter-spaced kicker used above
 * headings and on cards. Teal by default; clay or faint as alternates.
 */
function Eyebrow({
  tone = "teal",
  children,
  style,
  ...rest
}) {
  const tones = {
    teal: "var(--text-accent)",
    clay: "var(--action-secondary)",
    faint: "var(--text-faint)",
    invert: "var(--on-ink-teal)"
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-block",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-eyebrow)",
      fontWeight: "var(--weight-medium)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: tones[tone] || tones.teal,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Eyebrow.jsx", error: String((e && e.message) || e) }); }

// components/core/Callout.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Folio Callout — the signature "say it like this" / "hold onto this" block.
 * Renders a labeled card with Fraunces body. tone: "accent" (paper + teal
 * left rule), "invert" (dark ink). The body uses the display serif.
 */
function Callout({
  label,
  tone = "accent",
  children,
  style,
  ...rest
}) {
  const isInvert = tone === "invert";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: isInvert ? "var(--surface-invert)" : "var(--surface-card)",
      color: isInvert ? "var(--text-invert)" : "var(--text-body)",
      border: isInvert ? "1px solid transparent" : "1px solid var(--border-strong)",
      borderLeft: isInvert ? "1px solid transparent" : "var(--border-accent) solid var(--teal)",
      borderRadius: "var(--radius-sm)",
      padding: "18px 20px",
      ...style
    }
  }, rest), label && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: "10px"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    tone: isInvert ? "invert" : "faint"
  }, label)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--weight-regular)",
      fontSize: "var(--text-quote)",
      lineHeight: "var(--leading-normal)",
      letterSpacing: "-0.01em"
    }
  }, children));
}
Object.assign(__ds_scope, { Callout });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Callout.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Folio Input — text field with label, mono-style optional hint, and
 * teal focus ring. Pairs with Folio tokens.
 */
function Input({
  label,
  hint,
  error,
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled = false,
  style,
  ...rest
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "7px",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-label)",
      letterSpacing: "var(--tracking-label)",
      textTransform: "uppercase",
      color: "var(--text-faint)"
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-base)",
      color: "var(--text-strong)",
      background: disabled ? "var(--surface-sunken)" : "var(--surface-card)",
      border: `1px solid ${error ? "var(--clay)" : focused ? "var(--teal)" : "var(--border-strong)"}`,
      borderRadius: "var(--radius-sm)",
      padding: "11px 14px",
      outline: "none",
      boxShadow: focused ? "0 0 0 3px var(--focus-ring)" : "none",
      transition: "border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)"
    }
  }, rest)), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-xs)",
      color: error ? "var(--clay)" : "var(--text-faint)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// ui_kits/folio_app/LibraryScreen.jsx
try { (() => {
// Folio — library grid screen.
function LibraryScreen({
  docs,
  onOpenDoc,
  onNew
}) {
  const {
    Button,
    Badge,
    Eyebrow
  } = window.FolioDesignSystem_e1268b;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "32px 44px 60px",
      maxWidth: 920,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "Workspace"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 500,
      fontSize: 34,
      letterSpacing: "-0.02em",
      color: "var(--text-strong)",
      margin: "10px 0 0"
    }
  }, "All documents")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: onNew
  }, "New document")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: "teal"
  }, "All"), /*#__PURE__*/React.createElement(Badge, {
    variant: "outline"
  }, "Notes"), /*#__PURE__*/React.createElement(Badge, {
    variant: "outline"
  }, "Briefs"), /*#__PURE__*/React.createElement(Badge, {
    variant: "outline"
  }, "Letters")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
      gap: 16
    }
  }, docs.map(d => /*#__PURE__*/React.createElement("button", {
    key: d.id,
    onClick: () => onOpenDoc(d.id),
    style: {
      textAlign: "left",
      cursor: "pointer",
      background: "var(--surface-card)",
      border: "1px solid var(--line-strong)",
      borderRadius: 14,
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      minHeight: 158,
      transition: "box-shadow 200ms, transform 120ms"
    },
    onMouseEnter: e => {
      e.currentTarget.style.boxShadow = "var(--shadow-md)";
      e.currentTarget.style.transform = "translateY(-2px)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.boxShadow = "none";
      e.currentTarget.style.transform = "none";
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: d.tagTone === "clay" ? "var(--clay)" : "var(--teal)"
    }
  }, d.kind), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--text-faint)"
    }
  }, d.date)), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 500,
      fontSize: 19,
      lineHeight: 1.2,
      letterSpacing: "-0.015em",
      color: "var(--text-strong)",
      margin: 0
    }
  }, d.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13.5,
      lineHeight: 1.5,
      color: "var(--text-muted)",
      margin: 0,
      flex: 1
    }
  }, d.excerpt)))));
}
window.LibraryScreen = LibraryScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/folio_app/LibraryScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/folio_app/ReaderScreen.jsx
try { (() => {
// Folio — document reader / editor screen.
function ReaderScreen({
  doc,
  onBack
}) {
  const {
    Button,
    Eyebrow,
    Callout,
    Badge
  } = window.FolioDesignSystem_e1268b;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 32px",
      borderBottom: "1px solid var(--line)",
      position: "sticky",
      top: 0,
      background: "color-mix(in srgb, var(--paper) 88%, transparent)",
      backdropFilter: "blur(8px)",
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      color: "var(--text-muted)",
      display: "flex",
      alignItems: "center",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      lineHeight: 1
    }
  }, "\u2190"), " Library"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: "teal"
  }, "Saved"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm"
  }, "Share"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm"
  }, "Publish"))), /*#__PURE__*/React.createElement("article", {
    style: {
      maxWidth: 680,
      margin: "0 auto",
      padding: "48px 26px 90px"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, doc.kind, " \xB7 ", doc.date), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 500,
      fontSize: 44,
      lineHeight: 1.05,
      letterSpacing: "-0.02em",
      color: "var(--text-strong)",
      margin: "16px 0 16px"
    }
  }, doc.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 17,
      lineHeight: 1.5,
      color: "var(--text-muted)",
      margin: "0 0 34px"
    }
  }, doc.excerpt), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 36
    }
  }, /*#__PURE__*/React.createElement(Callout, {
    tone: "invert",
    label: "Hold onto this"
  }, doc.anchor)), doc.body.map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      borderTop: "1px solid var(--line)",
      paddingTop: 28,
      marginTop: 34
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      letterSpacing: "0.1em",
      color: "var(--teal)",
      display: "block",
      marginBottom: 8
    }
  }, b.num), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 500,
      fontSize: 24,
      lineHeight: 1.18,
      letterSpacing: "-0.015em",
      color: "var(--text-strong)",
      margin: "0 0 16px"
    }
  }, b.heading), /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: "0 0 18px",
      padding: 0,
      listStyle: "none"
    }
  }, b.points.map((p, j) => /*#__PURE__*/React.createElement("li", {
    key: j,
    style: {
      position: "relative",
      paddingLeft: 22,
      marginBottom: 11,
      fontFamily: "var(--font-sans)",
      fontSize: 16.5,
      lineHeight: 1.62,
      color: "var(--text-body)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 2,
      top: 11,
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: "var(--teal)"
    }
  }), p))), b.say && /*#__PURE__*/React.createElement(Callout, {
    label: "Say it like this"
  }, b.say)))));
}
window.ReaderScreen = ReaderScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/folio_app/ReaderScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/folio_app/Sidebar.jsx
try { (() => {
// Folio writing app — left sidebar. Self-registers on window.
function Sidebar({
  active,
  onNavigate,
  docs,
  activeDocId,
  onOpenDoc
}) {
  const navItems = [{
    id: "library",
    label: "All documents",
    count: docs.length
  }, {
    id: "drafts",
    label: "Drafts",
    count: 2
  }, {
    id: "shared",
    label: "Shared with me",
    count: 4
  }, {
    id: "archive",
    label: "Archive",
    count: 11
  }];
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 264,
      flexShrink: 0,
      height: "100%",
      boxSizing: "border-box",
      background: "var(--surface-card)",
      borderRight: "1px solid var(--line)",
      display: "flex",
      flexDirection: "column",
      padding: "22px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "0 8px 22px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 26,
      height: 26,
      borderRadius: 7,
      background: "var(--teal)",
      color: "var(--on-ink)",
      display: "grid",
      placeItems: "center",
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 15
    }
  }, "F"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 18,
      letterSpacing: "-0.01em",
      color: "var(--text-strong)"
    }
  }, "Folio")), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, navItems.map(it => /*#__PURE__*/React.createElement("button", {
    key: it.id,
    onClick: () => onNavigate(it.id),
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      textAlign: "left",
      border: "none",
      cursor: "pointer",
      padding: "9px 10px",
      borderRadius: 8,
      background: active === it.id ? "var(--teal-soft)" : "transparent",
      color: active === it.id ? "var(--teal)" : "var(--text-muted)",
      fontFamily: "var(--font-sans)",
      fontSize: 14.5,
      fontWeight: active === it.id ? 600 : 500
    }
  }, /*#__PURE__*/React.createElement("span", null, it.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      opacity: 0.7
    }
  }, it.count)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 26,
      padding: "0 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      letterSpacing: "0.15em",
      textTransform: "uppercase",
      color: "var(--text-faint)",
      marginBottom: 12
    }
  }, "Recent"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 1
    }
  }, docs.slice(0, 4).map(d => /*#__PURE__*/React.createElement("button", {
    key: d.id,
    onClick: () => onOpenDoc(d.id),
    style: {
      textAlign: "left",
      border: "none",
      background: activeDocId === d.id ? "var(--paper-dim)" : "transparent",
      cursor: "pointer",
      padding: "7px 8px",
      borderRadius: 7,
      fontFamily: "var(--font-sans)",
      fontSize: 13.5,
      color: "var(--text-body)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, d.title)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 8px 0",
      borderTop: "1px solid var(--line)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: "50%",
      background: "var(--clay-soft)",
      color: "var(--clay)",
      display: "grid",
      placeItems: "center",
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      fontWeight: 500
    }
  }, "JL"), /*#__PURE__*/React.createElement("div", {
    style: {
      lineHeight: 1.2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13.5,
      fontWeight: 600,
      color: "var(--text-strong)"
    }
  }, "Jordan Lee"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      color: "var(--text-faint)"
    }
  }, "Free plan"))));
}
window.Sidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/folio_app/Sidebar.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Callout = __ds_scope.Callout;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.Input = __ds_scope.Input;

})();
