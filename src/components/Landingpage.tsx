import ForgeDashboard from './ForgeDashboard';
import Leaderboard from './Leaderboard';

export default function LandingPage() {
  return (
    <div className="w-full bg-zinc-950 font-sans selection:bg-red-600 selection:text-white">
      
      {/* ========================================= */}
      {/* SECTION 1: THE HERO (Video Background) */}
      {/* ========================================= */}
      <div className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden">
        
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="/bg-video.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-zinc-950/70 z-10 backdrop-grayscale-[0.5]"></div>

        <div className="relative z-20 text-center animate-fade-in flex flex-col items-center">
          <h1 className="text-7xl md:text-9xl font-black text-red-600 uppercase tracking-tighter drop-shadow-2xl">
            ForgeFi
          </h1>
          <p className="text-zinc-300 font-bold uppercase tracking-[0.3em] text-sm md:text-base mt-4 mb-12">
            Proof of Workout Protocol
          </p>
          
          <div className="animate-bounce flex flex-col items-center text-zinc-500">
            <span className="text-xs font-black uppercase tracking-widest mb-2">Scroll to Enter</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* SECTION 2: THE CONTENT (Solid Background) */}
      {/* ========================================= */}
      <div className="relative z-30 w-full max-w-5xl mx-auto px-4 py-24 flex flex-col gap-16">
        
        {/* The Manifesto / How It Works */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto border-l-4 border-red-600 pl-6 py-2">
          <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-6">
            Discipline Enforced by Code.
          </h2>
          <p className="text-zinc-400 text-lg md:text-xl leading-relaxed">
            Standard gym memberships profit when you fail. ForgeFi flips the script. Lock your SOL into a smart contract, verify your daily workout, and keep your crypto. Miss a day, and your stake is slashed. 
          </p>
        </div>

        {/* The Leaderboard */}
        <div className="w-full">
          <Leaderboard />
        </div>

        {/* GLOWING RED SEPARATOR */}
        <div className="relative w-full h-8 my-8 flex items-center justify-center">
          {/* The deep red glow (shadow) */}
          <div className="absolute w-full h-[2px] bg-red-600 shadow-[0_0_20px_5px_rgba(220,38,38,0.7)]"></div>
          {/* The white-hot laser core */}
          <div className="absolute w-full h-[1px] bg-red-300"></div>
        </div>

        {/* The Dashboard */}
        <div className="flex flex-col items-center w-full pt-4">
           <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-8 text-center">
             Ready to Lock In?
           </h2>
          <ForgeDashboard />
        </div>

      </div>
    </div>
  );
}