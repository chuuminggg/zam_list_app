interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
}

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-4 animate-fade-in">
      <div className="text-4xl mb-3" aria-hidden="true">
        {icon}
      </div>
      <p className="text-gray-600 dark:text-gray-300 font-medium">{title}</p>
      {description && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{description}</p>
      )}
    </div>
  );
}
