import { useCallback, useState, useEffect, ReactElement } from "react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useClock } from "@/hooks/useClock";

// Define types for icons
type IconKey = "factory" | "gauge" | "monitor";
type IconsObject = Record<IconKey, ReactElement>;

// Define icons for manufacturing
const icons: IconsObject = {
  factory: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-8 w-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19.5 8.5V2a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v6.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V2a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v6.5a1 1 0 0 1-1 1 1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h17a1 1 0 0 0 1-1v-9.5a1 1 0 0 0-1-1 1 1 0 0 1-1-1Z" />
      <path d="M3 20.5V10" />
      <path d="M21 10v10.5" />
    </svg>
  ),
  gauge: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-8 w-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 6v2"></path>
      <path d="M16.24 7.76l-1.42 1.42"></path>
      <path d="M18 12h-2"></path>
      <path d="M16.24 16.24l-1.42-1.42"></path>
      <path d="M12 18v-2"></path>
      <path d="M7.76 16.24l1.42-1.42"></path>
      <path d="M6 12h2"></path>
      <path d="M7.76 7.76l1.42 1.42"></path>
      <path d="M12 12L8 8"></path>
    </svg>
  ),
  monitor: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-8 w-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
      <path d="M3 8h18"></path>
      <path d="M7 12h10"></path>
      <path d="M7 16h10"></path>
    </svg>
  ),
};

export default function Header() {
  const [location, setLocation] = useLocation();
  const { formattedTime } = useClock();

  // Store state with default values
  const [title, setTitle] = useState("Manufacturing Monitor System");
  const [currentIcon, setCurrentIcon] = useState<IconKey>("gauge");
  const [showSettings, setShowSettings] = useState(false);

  // Load settings from local storage on component mount
  useEffect(() => {
    const storedTitle = localStorage.getItem("appTitle");
    const storedIcon = localStorage.getItem("appIcon") as IconKey;

    if (storedTitle) {
      setTitle(storedTitle);
    }

    if (storedIcon && Object.keys(icons).includes(storedIcon)) {
      setCurrentIcon(storedIcon);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    // Invalidate all queries to force a refresh of data
    queryClient.invalidateQueries();
  }, []);

  const saveSettings = (newTitle: string, newIcon: IconKey) => {
    localStorage.setItem("appTitle", newTitle);
    localStorage.setItem("appIcon", newIcon);
    setTitle(newTitle);
    setCurrentIcon(newIcon);
    setShowSettings(false);
  };

  return (
    <header className="bg-primary-600 text-white shadow-md sticky top-0 z-50 w-full">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div
          className="flex items-center space-x-2"
          onClick={() => setLocation("/")}
          style={{ cursor: "pointer" }}
        >
          {icons[currentIcon]}
          <h1 className="text-xl font-bold text-gray-600">{title}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-600">{formattedTime}</span>
          <button
            className="bg-white bg-opacity-20 rounded px-3 py-1.5 flex items-center"
            onClick={handleRefresh}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
            <span>Refresh</span>
          </button>
          <button
            className="bg-white bg-opacity-20 rounded px-3 py-1.5 flex items-center"
            onClick={() => setShowSettings(!showSettings)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute right-4 top-16 z-10 bg-white text-gray-800 rounded-lg shadow-lg p-4 w-80">
          <h3 className="text-lg font-semibold mb-3">Application Settings</h3>

          <div className="mb-4">
            <label
              htmlFor="appTitleInput"
              className="block text-sm font-medium mb-1"
            >
              Application Title
            </label>
            <input
              type="text"
              className="w-full border rounded p-2 text-gray-800"
              defaultValue={title}
              id="appTitleInput"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Select Icon
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(icons) as [IconKey, ReactElement][]).map(
                ([key, icon]) => (
                  <div
                    key={key}
                    className={`border p-2 rounded flex justify-center items-center cursor-pointer ${currentIcon === key ? "border-primary-500 bg-primary-50" : "border-gray-300"}`}
                    onClick={() => {
                      const selection = document.getElementById(
                        "iconSelection",
                      ) as HTMLSelectElement;
                      if (selection) {
                        selection.value = key;
                      }
                    }}
                  >
                    {/* Clone element with Typescript safety */}
                    {icon && {
                      ...icon,
                      props: {
                        ...icon.props,
                        className: "h-6 w-6 text-gray-700",
                      },
                    }}
                  </div>
                ),
              )}
            </div>
            <select
              id="iconSelection"
              className="hidden"
              defaultValue={currentIcon}
            >
              {(Object.keys(icons) as IconKey[]).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              className="px-3 py-1.5 border border-gray-300 rounded"
              onClick={() => setShowSettings(false)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1.5 bg-primary-600 text-white rounded"
              onClick={() => {
                const titleInput = document.getElementById(
                  "appTitleInput",
                ) as HTMLInputElement;
                const iconSelect = document.getElementById(
                  "iconSelection",
                ) as HTMLSelectElement;

                if (titleInput && iconSelect) {
                  const newTitle =
                    titleInput.value || "Manufacturing Monitor System";
                  const newIcon = (iconSelect.value as IconKey) || "gauge";
                  saveSettings(newTitle, newIcon);
                }
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
