interface UserMenuProps {
  onNavigateToSaved: () => void;
  onClose: () => void;
}

export function UserMenu({ onNavigateToSaved, onClose }: UserMenuProps) {
  return (
    <div className="fixed top-20 right-8 bg-white border-2 border-black rounded-2xl shadow-xl p-2 w-48 z-50">
      <div className="space-y-1">
        <button className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg">
          Profile
        </button>
        <button 
          onClick={() => {
            onNavigateToSaved();
            onClose();
          }}
          className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg"
        >
          Saved
        </button>
        <button className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg">
          Setting
        </button>
        <button className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg text-red-600">
          Logout
        </button>
      </div>
    </div>
  );
}
