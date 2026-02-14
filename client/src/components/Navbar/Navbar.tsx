// import { Routes, Route } from 'react-router-dom';
import style from './Navbar.module.css';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {

    const navigate = useNavigate();


    return (
        <>
            <nav className={style.navbar}>
                <h1 className={style.title}>Bill Split App</h1>

                <div className={style.navlinks}>
                    <a href="/">Home</a>
                    <a href="/about">About</a>
                    <a href="/contact">Contact</a>
                </div>

                <div className={style.buttons}>
                    <button className={style.loginButton} onClick={() => navigate('/login')}>Login</button>
                    <button className={style.signupButton}>Sign Up</button>
                </div>
            </nav>
        </>
    )

}

export default Navbar