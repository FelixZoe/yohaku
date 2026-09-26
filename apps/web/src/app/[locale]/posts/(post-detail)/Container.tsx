export const Container: Component = ({ children }) => (
  // 80rem (max-w-7xl) + 32px to offset the 16px × 2 padding added inside
  // `.yohaku-paper-main-slot` — keeps the article content width matching
  // the original (~920px) instead of being eaten by the new padding.
  <div className="container m-auto mt-[120px] max-w-[calc(80rem+32px)] px-0 md:px-6 lg:px-4 xl:px-0">
    {children}
  </div>
)
