const Loader = ({ size, color }) => {
    return (
      <div className="flex flex-col items-center">
        <span
          className={`border-2 border-solid rounded-full animate-spin ${color} w-${size} h-${size}`}
        />
      </div>
    );
  };
  
  export default Loader;