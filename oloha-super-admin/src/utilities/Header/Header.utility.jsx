import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../redux/slices/auth.slice";
import { getSuperAdmin } from "../../redux/slices/super-admin.slice";
import { toast } from "react-hot-toast";
import Logo from "../../assets/logo/logo.png";
import imgPlaceholder from "../../assets/placeHolders/img-placeholder.png";
import Button from "../Button/Button.utility";
import "../../styles/global.styles.css";
import "./Header.utility.css";

const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const user = useSelector((state) => state.auth.user);
  const superAdmin = useSelector((state) => state.superAdmin.superAdmin);
  const profilePicture = superAdmin?.profilePicture || imgPlaceholder;
  const userName = superAdmin?.userName || user?.userName || "Admin";

  useEffect(() => {
    if (user?.id) {
      dispatch(getSuperAdmin(user.id));
    }
  }, [dispatch, user?.id]);

  /**
   * Handles user logout process
   */
  const handleLogout = async () => {
    setLoading(true);

    try {
      const resultAction = await dispatch(logout());

      // ✅ SUCCESS — message from backend
      if (logout.fulfilled.match(resultAction)) {
        const message = resultAction.payload?.message;

        if (message) {
          toast.success(message);
        }

        setTimeout(() => {
          navigate("/");
        }, 1500);
        return;
      }

      // ❌ ERROR — message from backend
      if (logout.rejected.match(resultAction)) {
        const message = resultAction.payload?.message;

        if (message) {
          toast.error(message);
        }
      }
    } catch (error) {
      // This should rarely happen, thunk already normalizes errors
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="header">
      <div className="header-container">
        {/* Logo Section */}
        <div className="logo">
          <img src={Logo} alt="Oloha Logo" className="logo-img" />
          <span className="logo-text">Oloha</span>
        </div>

        {/* Navigation Section */}
        <nav className="nav">
          <div className="profile-section">
            {/* User Welcome Message */}
            <span className="welcome-text">Welcome, {userName}</span>

            {/* Logout Button */}
            <Button
              className="logout-btn"
              onPress={handleLogout}
              loading={loading}
              title="Logout"
              icon={<i className="fas fa-sign-out-alt"></i>}
              variant="danger"
              size="small"
            />

            {/* Profile Image */}
            <img src={profilePicture} alt="Profile" className="profile-img" />
          </div>
        </nav>
      </div>
    </section>
  );
};

export default Header;
