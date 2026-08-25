export const rester=async(req, res) =>{
    let{firstName, lastName, email, password}=req.body
    if(!firstName || !email || !password){
        rester.setHeader('Content-type', 'application/json');
        return res.status(400).json({error:"fistName | lastName | password"});
    }
    try {
        let existe=await userDAO


        res.setHeader('content-type', 'application/json')
        res.status(200).json({})
    } catch (error) {
        
    }
}