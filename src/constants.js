export const COLORS = {
  yellow: true,
  orange: true,
  red: true,
  green: true,
  teal: true,
  blue: true,
  purple: true,
  gray: true,
};

export const WEB_STATE_KEY = "keep_sticky_board_state_v1";

export const DEMO_NOTES = [
  {
    id: "demo-1",
    title: "Welcome 👋",
    text: "This is the *web demo* of Keep Sticky Board.\n\nDrag me by my title bar.",
    color: "yellow",
    labels: ["demo", "welcome", "ss", "s", "e", "t"],
  },
  {
    id: "demo-2",
    title: "How it works",
    text: "• Notes are draggable\n• Labels filter on the right\n• Search works\n• Images now render inline\n\nDesktop app can import Google Keep Takeout.",
    color: "teal",
    labels: ["demo"],
  },
  {
    id: "demo-3",
    title: "Try links",
    text: "Linkify test:\nhttps://github.com/monapdx/keep-stickyboard\n\n(Clicking won’t start a drag.)",
    color: "purple",
    labels: ["demo", "links"],
  },
  {
    id: "demo-4",
    title: "Example label",
    text: "Click a label chip to filter.\nThen set dropdown back to ALL.",
    color: "orange",
    labels: ["demo", "labels"],
  },
  {
    id: "demo-5",
    title: "Image support",
    text: "If a note includes an image field, it shows up right inside the sticky note.",
    color: "green",
    labels: ["demo", "images"],
    image: "/social.png",
  },
];

export const DEMO_POSITIONS = {
  "demo-1": { x: 70, y: 140 },
  "demo-2": { x: 360, y: 180 },
  "demo-3": { x: 140, y: 420 },
  "demo-4": { x: 560, y: 360 },
  "demo-5": { x: 840, y: 150 },
};
