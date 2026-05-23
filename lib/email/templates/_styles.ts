/**
 * Shared style tokens for Vyrek transactional emails. Inline styles only,
 * email clients (especially Outlook) ignore <style> sheets and CSS classes.
 */

export const BG = "#0A0A0A";
export const SURFACE = "#141414";
export const BORDER = "#2A2A2A";
export const TEXT = "#F5F5F3";
export const TEXT_DIM = "#A8A8A6";
export const TEXT_FAINT = "#8A8A88";
export const ACCENT = "#A3E635";

export const TECH_MARK = "[ VYREK · FITNESS / 2026 · MADE IN UK ]";

export const fontStack =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
export const monoStack =
  "'Geist Mono', ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

export const bodyStyle = {
  background: BG,
  color: TEXT,
  fontFamily: fontStack,
  margin: 0,
  padding: 0,
};

export const containerStyle = {
  background: BG,
  margin: "0 auto",
  maxWidth: 560,
  padding: "32px 24px",
};

export const monoEyebrow = {
  color: ACCENT,
  fontFamily: monoStack,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.22em",
  margin: 0,
  textTransform: "uppercase" as const,
};

export const techMarkStyle = {
  color: TEXT_FAINT,
  fontFamily: monoStack,
  fontSize: 11,
  letterSpacing: "0.18em",
  margin: 0,
  textTransform: "uppercase" as const,
};

export const ctaPrimary = {
  background: ACCENT,
  borderRadius: 999,
  color: "#0A0A0A",
  display: "inline-block",
  fontFamily: fontStack,
  fontSize: 16,
  fontWeight: 500,
  padding: "14px 28px",
  textDecoration: "none",
};

export const ctaSecondary = {
  background: "transparent",
  border: `1px solid ${BORDER}`,
  borderRadius: 999,
  color: TEXT,
  display: "inline-block",
  fontFamily: fontStack,
  fontSize: 14,
  fontWeight: 500,
  padding: "10px 18px",
  textDecoration: "none",
};

export const hrRule = {
  border: "none",
  borderTop: `1px solid ${BORDER}`,
  margin: "24px 0",
};
