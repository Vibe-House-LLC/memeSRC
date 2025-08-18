interface ActionButtonProps {
    icon: string;
    bgColor?: string;
    textColor?: string;
  }
  
  export default function ActionButton({ 
    icon, 
    bgColor = "bg-white", 
    textColor = "text-black" 
  }: ActionButtonProps) {
    return (
      <button className={`${bgColor} ${textColor} p-2 rounded-full shadow-lg hover:opacity-80 text-xl`}>
        {icon}
      </button>
    )
  }
