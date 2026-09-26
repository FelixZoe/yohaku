# Comment Config Guard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose `disableComment` and `allowGuestComment` through aggregate data and use them in Shiroi to guard anonymous comment mode.

**Architecture:** Keep `allowComment` on content payloads and add global comment options to aggregate data. In Shiroi, `CommentAreaRoot` decides closed state from content + global flags, while `CommentBoxRoot`, `SwitchCommentMode`, and `SignedOutContent` enforce the no-guest guard for signed-out users.

**Tech Stack:** NestJS, TypeScript, api-client, Next.js, next-intl, Jotai, Vitest

---
