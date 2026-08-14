import React from 'react';

interface EmployeeAvatarProps {
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'WORKING' | 'PRESENT' | 'LATE' | 'ABSENT' | 'AUTO_SIGNED_OUT' | 'ACTIVE' | 'INACTIVE' | null;
  className?: string;
  imageUrl?: string;
}

const colorPalette = [
  'bg-slate-900 text-amber-300',
  'bg-slate-800 text-white',
  'bg-amber-700 text-white',
  'bg-emerald-800 text-white',
  'bg-blue-800 text-white',
  'bg-indigo-800 text-white',
  'bg-teal-800 text-white',
];

export const EmployeeAvatar: React.FC<EmployeeAvatarProps> = ({
  name = 'Staff',
  size = 'md',
  status,
  className = '',
  imageUrl,
}) => {
  const [imgError, setImgError] = React.useState(false);
  const cleanName = name?.trim() || 'Staff';
  const parts = cleanName.split(' ').filter(Boolean);
  const initials = parts.length >= 2 
    ? `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
    : cleanName.substring(0, 2).toUpperCase();

  // Reset imgError if imageUrl changes
  React.useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  // Deterministic color assignment based on name string
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorClass = colorPalette[Math.abs(hash) % colorPalette.length];

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px] rounded-lg',
    sm: 'w-8 h-8 text-xs rounded-xl font-bold',
    md: 'w-10 h-10 text-xs rounded-xl font-bold',
    lg: 'w-14 h-14 text-base rounded-2xl font-bold',
    xl: 'w-20 h-20 text-2xl rounded-3xl font-extrabold shadow-sm',
  };

  const statusDotSize = {
    xs: 'w-1.5 h-1.5 ring-1',
    sm: 'w-2.5 h-2.5 ring-1.5',
    md: 'w-3 h-3 ring-2',
    lg: 'w-3.5 h-3.5 ring-2',
    xl: 'w-4 h-4 ring-2',
  };

  const statusColors = {
    WORKING: 'bg-emerald-500 ring-white animate-pulse',
    PRESENT: 'bg-emerald-500 ring-white',
    ACTIVE: 'bg-emerald-500 ring-white',
    LATE: 'bg-amber-500 ring-white',
    ABSENT: 'bg-slate-400 ring-white',
    AUTO_SIGNED_OUT: 'bg-rose-500 ring-white',
    INACTIVE: 'bg-slate-300 ring-white',
  };

  const showImage = Boolean(imageUrl && !imgError);

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}>
      {showImage ? (
        <img
          src={imageUrl}
          alt={cleanName}
          onError={() => setImgError(true)}
          className={`${sizeClasses[size]} object-cover border border-slate-200/80 shadow-xs`}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className={`${sizeClasses[size]} ${colorClass} flex items-center justify-center tracking-tight border border-white/20 shadow-xs`}
        >
          {initials}
        </div>
      )}

      {status && statusColors[status] && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ${statusColors[status]} ${statusDotSize[size]}`}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
};
