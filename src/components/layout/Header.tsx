import chanterelleLogo from '../../assets/chanterelle.png';
// import { signInWithRedirect, getCurrentUser } from "aws-amplify/auth";
// import { useState, useEffect } from "react";

// Header Component
const Header = () => {
    // const [user, setUser] = useState<any>(null);

    // useEffect(() => {
    //     // Try to get the current user on mount
    //     getCurrentUser()
    //         .then((userData) => setUser(userData))
    //         .catch(() => setUser(null));
    // }, []);
    return (
        <header className="bg-gradient-to-r from-blue-900 via-violet-600 to-pink-600 shadow-md"> 
        {/* could do in tailwind: bg-gradient-to-r from-blue-800 via-white to-blue-900 */}
            <div className="max-w-7xl mx-auto px-4 py-1">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img
                            src={chanterelleLogo}
                            alt="ML Logo"
                            className="h-10 w-10 object-contain "
                        />
                        {/* <h1 className="text-2xl font-extrabold text-blue-800 tracking-tight drop-shadow-sm">
                        ML Catalogue
                    </h1> */}
                    </div>
                    <div>
                        {/* {user ? (
                            <div className="flex items-center gap-3">
                                <span className="text-gray-700 font-semibold">
                                    Welcome, {user?.signInDetails?.loginId || user?.username || "User"}!
                                </span>
                                <button
                                    onClick={() => {
                                        // Handle sign out logic here
                                        console.log("Sign out clicked");
                                    }}
                                    className="px-5 py-2 rounded-full bg-blue-700 text-white font-semibold shadow hover:bg-blue-800 transition-colors duration-200 cursor-pointer"
                                >
                                    Sign Out
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => signInWithRedirect({ provider: { custom: 'DebanaSSABAzureAD' } })}
                                className="px-5 py-2 rounded-full bg-blue-700 text-white font-semibold shadow hover:bg-blue-800 transition-colors duration-200 cursor-pointer"
                            >
                                Log in
                            </button>
                        )} */}
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;