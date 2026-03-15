const VIEW_PORTS = {
  mobile: [
    { name: 'iPhone SE/Older', width: 375, height: 667 },
    { name: 'iPhone 15/16 Pro', width: 393, height: 852 },
    { name: 'Pixel 8/9', width: 412, height: 915 },
    { name: 'iPhone 16 Pro Max', width: 430, height: 932 },
  ],
  tablet: [
    { name: 'iPad Mini (Portrait)', width: 768, height: 1024 },
    { name: 'iPad Air (Portrait)', width: 820, height: 1180 },
    { name: 'Samsung Tab S9 (Landscape)', width: 1280, height: 800 },
    { name: 'iPad Pro 13 (Landscape)', width: 1366, height: 1024 },
  ],
  desktop: [
    { name: 'Budget Laptop', width: 1366, height: 768 },
    { name: 'Standard Desktop (1080p)', width: 1920, height: 1080 },
    { name: 'MacBook Air 13', width: 1440, height: 900 },
    { name: 'Ultra-Wide', width: 2560, height: 1440 },
  ]
};

const FLATTEN_VIEW_PORTS = Object.values(VIEW_PORTS).flat();

export {
    VIEW_PORTS,
    FLATTEN_VIEW_PORTS
}