/**
 * Entry point for the single-file build (scripts/build-unveil-standalone.mjs).
 *
 * Renders the same <Unveil /> component the Next route uses, into a plain
 * HTML document with the stylesheet inlined and the fonts loaded from Google.
 * It exists so the page can be opened from a file or hosted anywhere static
 * without the Next.js runtime.
 */
import { createRoot } from "react-dom/client";
import Unveil from "../../components/unveil/Unveil";

const host = document.getElementById("unveil-root");
if (host) createRoot(host).render(<Unveil />);
