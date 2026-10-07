import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { MarketPanels } from "./MarketPanels";
import { SetupGuide } from "./SetupGuide";

type Tab = "market" | "setup";
type Props = {
  symbols: string[];
  newSymbol: string;
  onNewSymbolChange: (value: string) => void;
  onAddSymbol: (event: FormEvent<HTMLFormElement>) => void;
};

export function ContentTabs(props: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(() =>
    new URLSearchParams(window.location.search).get("tab") === "setup" ? "setup" : "market",
  );
  const marketTab = useRef<HTMLButtonElement>(null);
  const setupTab = useRef<HTMLButtonElement>(null);

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next: Tab = event.key === "Home" ? "market" : event.key === "End" ? "setup"
      : activeTab === "market" ? "setup" : "market";
    setActiveTab(next);
    (next === "market" ? marketTab : setupTab).current?.focus();
  }

  return (
    <section className="content-section" aria-label="Demo content">
      <div className="content-tabs" role="tablist" aria-label="Demo sections">
        <button
          ref={marketTab}
          id="tab-market"
          type="button"
          role="tab"
          aria-controls="panel-market"
          aria-selected={activeTab === "market"}
          tabIndex={activeTab === "market" ? 0 : -1}
          onClick={() => setActiveTab("market")}
          onKeyDown={onTabKeyDown}
        >
          Market panels
        </button>
        <button
          ref={setupTab}
          id="tab-setup"
          type="button"
          role="tab"
          aria-controls="panel-setup"
          aria-selected={activeTab === "setup"}
          tabIndex={activeTab === "setup" ? 0 : -1}
          onClick={() => setActiveTab("setup")}
          onKeyDown={onTabKeyDown}
        >
          Setup guide
        </button>
      </div>
      <div id="panel-market" role="tabpanel" aria-labelledby="tab-market" hidden={activeTab !== "market"}>
        <MarketPanels {...props} />
      </div>
      <div id="panel-setup" role="tabpanel" aria-labelledby="tab-setup" hidden={activeTab !== "setup"}>
        <SetupGuide />
      </div>
    </section>
  );
}
