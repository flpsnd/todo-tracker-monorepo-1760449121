# Design System Guide
## Modern Todo App Visual Style Guidelines

This design system guide captures the visual patterns, components, and design rules from the modern todo application. Use these guidelines to maintain consistent visual design across projects.

---

## 🎨 **Color System**

### **Primary Color Palette**
The app uses a sophisticated monochromatic color system with OKLCH color space for better perceptual uniformity.

#### **Light Theme Colors**
```css
:root {
  --background: oklch(1 0 0);           /* Pure white */
  --foreground: oklch(0.145 0 0);        /* Near black */
  --card: oklch(1 0 0);                 /* Pure white */
  --primary: oklch(0.205 0 0);          /* Dark gray */
  --secondary: oklch(0.97 0 0);         /* Light gray */
  --muted: oklch(0.97 0 0);            /* Light gray */
  --accent: oklch(0.97 0 0);           /* Light gray */
  --border: oklch(0.922 0 0);          /* Medium gray */
  --destructive: oklch(0.577 0.245 27.325); /* Red-orange */
}
```

#### **Dark Theme Colors**
```css
.dark {
  --background: oklch(0.145 0 0);       /* Near black */
  --foreground: oklch(0.985 0 0);       /* Near white */
  --card: oklch(0.145 0 0);             /* Near black */
  --primary: oklch(0.985 0 0);          /* Near white */
  --secondary: oklch(0.269 0 0);        /* Dark gray */
  --muted: oklch(0.269 0 0);           /* Dark gray */
  --accent: oklch(0.269 0 0);          /* Dark gray */
  --border: oklch(0.269 0 0);          /* Dark gray */
  --destructive: oklch(0.396 0.141 25.723); /* Dark red */
}
```

### **Task Color Palette**
The app includes a curated set of pastel colors for task categorization:

```css
const TASK_COLORS = [
  { name: "Red", value: "#ffb3ba", textColor: "#000000" },
  { name: "Orange", value: "#ffdfba", textColor: "#000000" },
  { name: "Yellow", value: "#ffffba", textColor: "#000000" },
  { name: "Green", value: "#baffc9", textColor: "#000000" },
  { name: "Blue", value: "#bae1ff", textColor: "#000000" },
  { name: "Purple", value: "#e0bbff", textColor: "#000000" },
  { name: "White", value: "#ffffff", textColor: "#000000" },
  { name: "Black", value: "#000000", textColor: "#ffffff" },
]
```

---

## 🔤 **Typography**

### **Font System**
- **Primary Font**: Geist Sans (modern, clean sans-serif)
- **Monospace Font**: Geist Mono (for UI elements and labels)
- **Font Loading**: Uses Next.js font optimization

### **Typography Scale**
```css
/* Headings */
.text-2xl { font-size: 1.5rem; font-weight: 600; }    /* Main titles */
.text-xl { font-size: 1.25rem; font-weight: 600; }    /* Section titles */
.text-sm { font-size: 0.875rem; font-weight: 500; }   /* Body text */
.text-xs { font-size: 0.75rem; font-weight: 500; }   /* Labels */

/* Font weights */
.font-semibold { font-weight: 600; }
.font-medium { font-weight: 500; }
```

### **Typography Rules**
- **UI Labels**: Always use `font-mono` for form labels and small UI text
- **Headings**: Use `font-mono` for section titles and main headings
- **Body Text**: Use default sans-serif for descriptions and content
- **Consistent Sizing**: Use Tailwind's text scale consistently

---

## 📐 **Layout & Spacing**

### **Container System**
```css
/* Main container */
.max-w-2xl { max-width: 42rem; }  /* 672px */
.mx-auto { margin-left: auto; margin-right: auto; }

/* Spacing scale */
.space-y-3 { gap: 0.75rem; }       /* 12px - between sections */
.space-y-2.5 { gap: 0.625rem; }    /* 10px - between form elements */
.mt-12 { margin-top: 3rem; }       /* 48px - between major sections */
```

### **Padding & Margins**
```css
/* Card padding */
.p-4 { padding: 1rem; }            /* 16px - standard card padding */
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.py-7 { padding-top: 1.75rem; padding-bottom: 1.75rem; } /* Task cards */

/* Button padding */
.p-2 { padding: 0.5rem; }          /* 8px - icon buttons */
```

---

## 🎯 **Component Design Patterns**

### **1. Task Cards**
```css
/* Base task card styling */
.task-card {
  @apply flex items-start gap-3 rounded-lg border border-border p-4 px-4 py-7;
  @apply transition-opacity duration-200;
  background-color: var(--task-color);
}

/* Completed task state */
.task-card.completed {
  @apply opacity-30;
}

/* Drag state */
.task-card.dragging {
  @apply scale-105 shadow-lg;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
  z-index: 50;
}
```

### **2. Form Elements**
```css
/* Input styling */
.input {
  @apply h-9 w-full rounded-md border border-input bg-transparent px-3 py-1;
  @apply text-sm shadow-xs transition-[color,box-shadow];
  @apply focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px];
}

/* Textarea styling */
.textarea {
  @apply min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2;
  @apply text-sm shadow-xs transition-[color,box-shadow];
  @apply focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px];
}

/* Button styling */
.button {
  @apply inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium;
  @apply transition-all focus-visible:ring-ring/50 focus-visible:ring-[3px];
}
```

### **3. Color Selection Grid**
```css
.color-grid {
  @apply grid grid-cols-2 gap-2;
}

.color-option {
  @apply h-7 w-7 rounded-md border-2 transition-all hover:scale-110;
  @apply border-transparent;
}

.color-option.selected {
  @apply border-black;
}
```

---

## 🎭 **Interactive States**

### **Hover Effects**
```css
/* Subtle hover transitions */
.hover-opacity {
  @apply hover:opacity-80 transition-opacity;
}

.hover-bg {
  @apply hover:bg-accent transition-colors;
}

.hover-scale {
  @apply hover:scale-110 transition-transform;
}
```

### **Focus States**
```css
/* Consistent focus rings */
.focus-ring {
  @apply focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px];
}
```

### **Drag & Drop States**
```css
/* Drag cursor */
.drag-cursor {
  @apply cursor-grab active:cursor-grabbing;
}

/* Drop zone styling */
.drop-zone {
  @apply border-2 border-dashed border-border rounded-lg p-8 text-center;
}
```

---

## 🌙 **Theme System**

### **Theme Implementation**
- **Provider**: Uses `next-themes` for theme management
- **Storage**: System preference detection with manual override
- **Transition**: Smooth transitions between themes
- **Icons**: Sun/Moon icons for theme toggle

### **Theme Toggle Component**
```css
.theme-toggle {
  @apply rounded-lg border border-border p-2 hover:bg-accent transition-colors;
}
```

---

## 🎨 **Visual Effects**

### **Animations**
```css
/* Framer Motion animations */
.animate-slide {
  initial: { opacity: 0, height: 0 }
  animate: { opacity: 1, height: "auto" }
  exit: { opacity: 0, height: 0 }
  transition: { duration: 0.3, ease: "easeInOut" }
}

/* Drag animations */
.animate-drag {
  scale: 1.02;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
}
```

### **Shadows**
```css
/* Subtle shadows */
.shadow-xs { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
.shadow-lg { box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
```

---

## 📱 **Responsive Design**

### **Breakpoints**
```css
/* Mobile first approach */
/* Base styles for mobile */
/* md: styles for tablet and up */
@media (min-width: 768px) {
  .md\:text-sm { font-size: 0.875rem; }
}
```

### **Layout Patterns**
- **Container**: Max-width with auto margins for centering
- **Spacing**: Consistent vertical rhythm
- **Typography**: Responsive text sizing

---

## 🧩 **Component Architecture**

### **Design System Stack**
- **Framework**: Next.js 15 + React 19
- **Styling**: Tailwind CSS 4.x
- **Components**: Radix UI + Custom components
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Theme**: next-themes

### **Component Structure**
```
components/
├── ui/                    # Base UI components
│   ├── button.tsx        # Button variants
│   ├── input.tsx         # Form inputs
│   └── textarea.tsx      # Text areas
├── task-card.tsx         # Task card component
├── task-form.tsx         # Task creation form
├── task-section.tsx      # Task section container
├── theme-toggle.tsx      # Theme switcher
└── theme-provider.tsx    # Theme context
```

---

## 🎯 **Design Principles**

### **1. Minimalism**
- Clean, uncluttered interfaces
- Plenty of white space
- Focus on content over decoration

### **2. Consistency**
- Uniform spacing and sizing
- Consistent color usage
- Predictable interaction patterns

### **3. Accessibility**
- High contrast ratios
- Focus indicators
- Semantic HTML structure

### **4. Performance**
- Optimized animations
- Efficient re-renders
- Smooth transitions

---

## 📋 **Implementation Checklist**

### **Setup Requirements**
- [ ] Install required dependencies
- [ ] Configure Tailwind CSS
- [ ] Set up theme provider
- [ ] Import font families
- [ ] Configure color variables

### **Component Implementation**
- [ ] Create base UI components
- [ ] Implement theme system
- [ ] Add animation support
- [ ] Set up responsive design
- [ ] Test accessibility features

### **Styling Guidelines**
- [ ] Use consistent spacing scale
- [ ] Apply hover and focus states
- [ ] Implement smooth transitions
- [ ] Test across different themes
- [ ] Validate responsive behavior

---

## 🔧 **Quick Start Template**

```tsx
// Theme Provider Setup
import { ThemeProvider } from "@/components/theme-provider"

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

// Component Usage
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function MyComponent() {
  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <Input placeholder="Enter text..." className="font-mono text-sm" />
      <Button className="font-mono text-sm">Submit</Button>
    </div>
  )
}
```

---

This design system provides a comprehensive foundation for creating consistent, modern, and accessible user interfaces that match the visual style of the todo application.
