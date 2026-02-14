interface ControlBarProps {
  isPlaying: boolean
  playbackSpeed: number
  elapsedMinutes: number
  totalMinutes: number
  onPlayPause: () => void
  onSpeedChange: (speed: number) => void
  onSeek: (minutes: number) => void
}

export default function ControlBar({
  isPlaying,
  playbackSpeed,
  elapsedMinutes,
  totalMinutes,
  onPlayPause,
  onSpeedChange,
  onSeek,
}: ControlBarProps) {
  const speeds = [0.5, 1, 2, 4]

  const formatTime = (minutes: number) => {
    const mins = Math.floor(minutes)
    const secs = Math.floor((minutes - mins) * 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-gray-800 text-white px-6 py-4">
      <div className="flex items-center gap-4">
        {/* 再生/一時停止 */}
        <button
          onClick={onPlayPause}
          className="w-12 h-12 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
        </button>

        {/* 時間表示 */}
        <span className="text-sm font-mono w-24">
          {formatTime(elapsedMinutes)} / {formatTime(totalMinutes)}
        </span>

        {/* シークバー */}
        <div className="flex-1">
          <input
            type="range"
            min="0"
            max={totalMinutes}
            step="0.1"
            value={elapsedMinutes}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* 速度調整 */}
        <div className="flex items-center gap-2">
          <span className="text-sm">速度:</span>
          {speeds.map((speed) => (
            <button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              className={`px-2 py-1 text-sm rounded transition-colors ${
                playbackSpeed === speed
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
