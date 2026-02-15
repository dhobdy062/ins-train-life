"use client";

import {
  Children,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  isValidElement,
  useMemo,
  useRef,
  useState,
} from "react";

type DashboardTabPanelProps = {
  id: string;
  label: string;
  children: ReactNode;
};

type DashboardTabsProps = {
  defaultTab?: string;
  children: ReactNode;
};

function isDashboardTabPanel(child: ReactNode): child is ReactElement<DashboardTabPanelProps> {
  if (!isValidElement<DashboardTabPanelProps>(child)) {
    return false;
  }

  return typeof child.props.id === "string" && typeof child.props.label === "string";
}

export function DashboardTabPanel(props: DashboardTabPanelProps) {
  void props;
  return null;
}

export default function DashboardTabs({ defaultTab, children }: DashboardTabsProps) {
  const panels = useMemo(() => Children.toArray(children).filter(isDashboardTabPanel), [children]);

  const initialTab = useMemo(() => {
    if (!panels.length) {
      return "";
    }

    const ids = panels.map((panel) => panel.props.id);
    return defaultTab && ids.includes(defaultTab) ? defaultTab : panels[0].props.id;
  }, [defaultTab, panels]);

  const [activeTab, setActiveTab] = useState(initialTab);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function focusTab(tabId: string) {
    tabRefs.current[tabId]?.focus();
    setActiveTab(tabId);
  }

  function handleKeyNavigation(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    if (!panels.length) {
      return;
    }

    const lastIndex = panels.length - 1;
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    } else if (event.key === "Home") {
      event.preventDefault();
      nextIndex = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      nextIndex = lastIndex;
    } else {
      return;
    }

    focusTab(panels[nextIndex].props.id);
  }

  return (
    <div className="dashboard-tabs">
      <div className="dashboard-tablist" role="tablist" aria-label="Dashboard sections">
        {panels.map((panel, index) => {
          const isActive = panel.props.id === activeTab;
          const tabDomId = `tab-${panel.props.id}`;
          const panelDomId = `panel-${panel.props.id}`;

          return (
            <button
              key={panel.props.id}
              type="button"
              id={tabDomId}
              ref={(node) => {
                tabRefs.current[panel.props.id] = node;
              }}
              role="tab"
              className={`dashboard-tab ${isActive ? "active" : ""}`}
              aria-selected={isActive}
              aria-controls={panelDomId}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(panel.props.id)}
              onKeyDown={(event) => handleKeyNavigation(event, index)}
            >
              {panel.props.label}
            </button>
          );
        })}
      </div>

      <div className="dashboard-panels">
        {panels.map((panel) => {
          const isActive = panel.props.id === activeTab;
          const tabDomId = `tab-${panel.props.id}`;
          const panelDomId = `panel-${panel.props.id}`;

          return (
            <section
              key={panel.props.id}
              id={panelDomId}
              role="tabpanel"
              aria-labelledby={tabDomId}
              className={`dashboard-panel ${isActive ? "active" : ""}`}
              hidden={!isActive}
            >
              {panel.props.children}
            </section>
          );
        })}
      </div>
    </div>
  );
}
