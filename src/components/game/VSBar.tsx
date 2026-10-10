import React from 'react';

interface VSBarProps {
  playerName: string;
  playerScore: number;
  playerStage: number;
  playerStageProgress: number;
  opponentName: string;
  opponentScore: number;
  opponentStage: number;
  opponentStageProgress: number;
}

const STAGE_LABELS = ['', 'SHIELD BUILDER', 'Stage 2', 'Stage 3'];

export const VSBar: React.FC<VSBarProps> = ({
  playerName,
  playerScore,
  playerStage,
  playerStageProgress,
  opponentName,
  opponentScore,
  opponentStage,
  opponentStageProgress,
}) => {
  const totalPlayerProg = ((playerStage - 1) * 100 + playerStageProgress) / 3;
  const totalOpponentProg = ((opponentStage - 1) * 100 + opponentStageProgress) / 3;

  return (
    <div className="w-full px-4 py-2 bg-background/95 border-b border-border flex flex-col gap-1">
      <div className="flex items-center gap-3 text-xs">
        {/* Player side */}
        <div className="flex flex-col items-start min-w-0 flex-1">
          <div className="flex items-center gap-1 w-full">
            <span className="text-primary font-bold truncate max-w-[80px]">{playerName}</span>
            <span className="text-muted-foreground ml-auto">{STAGE_LABELS[playerStage]}</span>
            <span className="text-secondary font-bold ml-2 shrink-0">{playerScore}pts</span>
          </div>
          <div className="w-full bg-input h-2 mt-1 rounded-sm overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${Math.min(100, totalPlayerProg)}%` }}
            />
          </div>
        </div>

        {/* VS */}
        <div className="text-destructive font-bold text-sm shrink-0">VS</div>

        {/* Opponent side */}
        <div className="flex flex-col items-end min-w-0 flex-1">
          <div className="flex items-center gap-1 w-full justify-end">
            <span className="text-secondary font-bold mr-2 shrink-0">{opponentScore}pts</span>
            <span className="text-muted-foreground">{STAGE_LABELS[opponentStage]}</span>
            <span className="text-destructive font-bold truncate max-w-[80px] text-right">{opponentName}</span>
          </div>
          <div className="w-full bg-input h-2 mt-1 rounded-sm overflow-hidden">
            <div
              className="bg-destructive h-full transition-all duration-300 ml-auto"
              style={{ width: `${Math.min(100, totalOpponentProg)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
