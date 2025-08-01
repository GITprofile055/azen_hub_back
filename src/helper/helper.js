const User = require('../models/User');
const Investment = require('../models/Investment');
const Income = require('../models/Income');

const addLevelIncome = async (id, amt, invest_id) => {
  try {
    const user = await User.findOne({ where: { id } });
    if (!user) return false;

    const rname = user.username;
    const fullname = user.name;
    let user_mid = user.id;
    const amount = amt / 100;
    let cnt = 1;

    while (user_mid && user_mid != 1 && cnt <= 20) {
      const currentUser = await User.findOne({ where: { id: user_mid } });
      const sponsorId = currentUser?.sponsor;

      let sponsorUser = null;
      let sp_status = 'Pending';
      let rank = 0;
      let plan = 0;

      if (sponsorId) {
        sponsorUser = await User.findOne({ where: { id: sponsorId } });

        activeDirects = await User.count({
          where: {
            sponsor: sponsorId,
            active_status: 'Active'
          }
        });

        sp_status = sponsorUser?.active_status || 'Pending';
        rank = sponsorUser?.rank || 0;

        const lastPackage = await Investment.findOne({
          where: {
            user_id: sponsorUser.id,
            status: 'Active'
          },
          order: [['id', 'DESC']]
        });

        plan = lastPackage?.plan || 0;
      }

      let pp = 0;

      if (sp_status === 'Active') {
        if (cnt === 1) pp = amount * 10;
        else if (cnt === 2) pp = amount * 5;
        else if (cnt === 3) pp = amount * 3;
        else if (cnt === 4) pp = amount * 2;
        else if (cnt === 5) pp = amount * 1;
        else if (cnt >= 6 && cnt <= 10) pp = amount * 0.50;

       
      }

      user_mid = sponsorUser?.id;

      if (user_mid && pp > 0) {
        await Income.create({
          user_id: user_mid,
          user_id_fk: sponsorUser.username,
          amt: amt,
          comm: pp,
          remarks: 'Level Bonus',
          level: cnt,
          rname: rname,
          invest_id: invest_id,
          fullname: fullname,
          ttime: new Date()
        });
      }

      cnt++;
    }

    return true;

  } catch (error) {
    console.error("Error in addLevelIncome:", error);
    return false;
  }
};




const addDirectIncome = async (userId, amt) => {
  try {
    const userData = await User.findOne({ where: { id: userId } });
    if (!userData) return false;

    const rname = userData.username;
    const fullname = userData.name;
    const user_mid = userData.id;
    const amount = amt / 100;
    const cnt = 1;

    const sponsorData = await User.findOne({ where: { id: user_mid } });
    const sponsorId = sponsorData?.sponsor || null;

    let sp_status = 'Pending';
    let Sposnor_status = null;
    let total_profit = 0;
    let total_get = 0;

    if (sponsorId) {
      Sposnor_status = await User.findOne({ where: { id: sponsorId } });
      sp_status = Sposnor_status?.active_status || 'Pending';

      const lastPackage = await Investment.sum('amount', {
        where: { user_id: Sposnor_status.id, status: 'Active' }
      });

      total_profit = await Income.sum('comm', {
        where: { user_id: Sposnor_status.id }
      });

      total_get = (lastPackage || 0) * 200 / 100;
    }

    const percent = 5;
    let pp = sp_status === 'Active' ? amount * percent : 0;

    const spid = Sposnor_status?.id || 0;

    const max_income = total_get;
    const n_m_t = max_income - (total_profit || 0);
    if (pp >= n_m_t) {
      pp = n_m_t;
    }

    if (spid > 0 && pp > 0) {
      await Income.create({
        user_id: spid,
        user_id_fk: Sposnor_status.username,
        amt: amt,
        comm: pp,
        remarks: 'Direct Bonus',
        level: cnt,
        rname: rname,
        fullname: fullname,
        ttime: new Date()
      });
    }

    return true;
  } catch (error) {
    console.error('Direct Income Error:', error);
    return false;
  }
};

module.exports = {
  addLevelIncome,
  addDirectIncome
};

