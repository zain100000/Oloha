/**
 * Dashboard Component
 *
 * Provides an overview of key business metrics including:
 * - Users: total count
 *
 * Features:
 * - Fetches data from Redux slices (users)
 * - Displays interactive statistic cards with icons
 * - Allows navigation to management pages
 *
 * @component
 * @example
 * return <Dashboard />
 *
 * @returns {JSX.Element} A dashboard overview with statistics and navigation
 */

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Card from "../../utilities/Card/Card.utility";
import { getUsers } from "../../redux/slices/user.slice";

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user = useSelector((state) => state.auth.user);
  const users = useSelector((state) => state.user.allUsers || []);

  console.log("Users in Dashboard:", users);

  useEffect(() => {
    if (user?.id) {
      dispatch(getUsers());
    }
  }, [dispatch, user?.id]);

  // User statistics
  const { totalUsers } = users.reduce(
    (acc) => {
      acc.totalUsers++;
      return acc;
    },
    {
      totalUsers: 0,
    }
  );

  const handleNavigate = (path) => navigate(path);

  return (
    <section id="dashboard" style={{ marginTop: 25 }}>
      <div className="container-fluid">
        <h2
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "var(--primary)",
            margin: 0,
            paddingLeft: "10px",
            borderLeft: "4px solid var(--primary)",
            marginBottom: "20px",
          }}
        >
          Dashboard Overview
        </h2>

        {/* Statistic Cards */}
        <div className="row g-2 mb-2">
          {/* Users Card */}
          <div className="col-12 col-md-6 col-lg-4">
            <Card
              onClick={() => handleNavigate("/super-admin/users/manage-users")}
              title="Users"
              icon={
                <i
                  className="fas fa-users fa-shake text-white"
                  style={{ animationDuration: "2s" }}
                />
              }
              stats={[{ label: "Total", value: totalUsers }]}
              gradientType="emerald"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
