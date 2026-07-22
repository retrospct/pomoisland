"use client";

import { useEffect } from "react";
import { mountSite } from "../main.js";

export default function Home() {
  useEffect(() => mountSite(), []);
  return <div id="site-root" />;
}
