import streamlit as st
import json
from datetime import datetime, timedelta
import random

st.set_page_config(page_title="토너먼트", page_icon="🏆", layout="wide")

DATA_FILE = "data.json"
SKILLS = {"마스터": 1, "백기사": 2, "아마추어": 3, "세미프로": 4, "프로": 5}

def load():
    try:
        return json.load(open(DATA_FILE, encoding="utf-8"))
    except:
        return {"tournaments": [], "next_id": 1}

def save(d):
    json.dump(d, open(DATA_FILE, "w", encoding="utf-8"), ensure_ascii=False)

data = st.session_state.get("data", load())
st.session_state.data = data

page = st.sidebar.radio("메뉴", ["참가신청", "대회생성", "관리", "대진표"])

if page == "참가신청":
    st.title("🏅 참가 신청")
    opens = [t for t in data["tournaments"] if t["status"] == "open"]
    if not opens:
        st.warning("모집중인 대회 없음")
    else:
        t = opens[st.selectbox("대회", range(len(opens)), format_func=lambda i: opens[i]["name"])]
        t = opens[t] if isinstance(t, int) else t
        with st.form("f"):
            nick = st.text_input("닉네임")
            gid = st.text_input("게임ID")
            skill = st.select_slider("실력", list(SKILLS.keys()))
            if st.form_submit_button("신청"):
                if nick and gid:
                    t["participants"].append({"id": len(t["participants"])+1, "nickname": nick, "gameId": gid, "skill": skill, "skillValue": SKILLS[skill]})
                    save(data)
                    st.success("완료!")
                    st.balloons()

elif page == "대회생성":
    st.title("✨ 대회 생성")
    with st.form("c"):
        name = st.text_input("대회명")
        game = st.text_input("게임")
        maxp = st.number_input("최대인원", 4, 64, 16)
        deadline = st.date_input("마감일")
        if st.form_submit_button("생성"):
            if name:
                data["tournaments"].append({"id": data["next_id"], "name": name, "game": game, "maxParticipants": maxp, "deadline": str(deadline), "status": "open", "participants": [], "teams": [], "bracket": None})
                data["next_id"] += 1
                save(data)
                st.success("생성완료!")

elif page == "관리":
    st.title("🔧 관리")
    if data["tournaments"]:
        t = data["tournaments"][st.selectbox("대회", range(len(data["tournaments"])), format_func=lambda i: data["tournaments"][i]["name"])]
        st.write(f"참가자: {len(t['participants'])}명")
        for p in t["participants"]:
            st.write(f"- {p['nickname']} ({p['skill']})")
        if st.button("팀편성") and len(t["participants"]) >= 2:
            ps = sorted(t["participants"], key=lambda x: x["skillValue"], reverse=True)
            teams, used = [], set()
            for p in ps:
                if p["id"] in used:
                    continue
                for q in reversed(ps):
                    if q["id"] not in used and q["id"] != p["id"]:
                        used.add(p["id"])
                        used.add(q["id"])
                        teams.append({"id": len(teams)+1, "name": f"팀{len(teams)+1}", "members": [p, q]})
                        break
            t["teams"] = teams
            t["status"] = "closed"
            save(data)
            st.success(f"{len(teams)}팀 생성!")

elif page == "대진표":
    st.title("🏁 대진표")
    ts = [t for t in data["tournaments"] if t["teams"]]
    if ts:
        t = ts[st.selectbox("대회", range(len(ts)), format_func=lambda i: ts[i]["name"])]
        if not t.get("bracket") and st.button("대진표생성"):
            random.shuffle(t["teams"])
            t["bracket"] = [{"team1": t["teams"][i]["name"], "team2": t["teams"][i+1]["name"] if i+1 < len(t["teams"]) else "BYE"} for i in range(0, len(t["teams"]), 2)]
            save(data)
            st.rerun()
        if t.get("bracket"):
            for m in t["bracket"]:
                st.write(f"⚔️ {m['team1']} vs {m['team2']}")
