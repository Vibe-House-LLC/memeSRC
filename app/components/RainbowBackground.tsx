export default function RainbowBackground() {
  return (
    <div className="absolute inset-0 z-0 top-12">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg,
            #5461c8 0%, #5461c8 12.5%,
            #c724b1 12.5%, #c724b1 25%,
            #e4002b 25%, #e4002b 37.5%,
            #ff6900 37.5%, #ff6900 50%,
            #f6be00 50%, #f6be00 62.5%,
            #97d700 62.5%, #97d700 75%,
            #00ab84 75%, #00ab84 87.5%,
            #00a3e0 87.5%, #00a3e0 100%
          )`,
        }}
      />
      <div className="absolute inset-0 bg-black opacity-10 dark:block hidden" />
    </div>
  );
}
