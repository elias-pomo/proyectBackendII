import mongoose from "mongoose";

const EventsSchema=new mongoose.Schema(
    {
        code: {
            type: String, unique: true, required: true, trim: true, 
        }, 
        title: {type: String, minLength: 3, required: true}, 
        description: {type: String, minLength: [10, "Cantidad minima de caracteres de la descripcion: 10. Usted ingresó {VALUE}"]},  
        price:{
            type: Number, default: 0
        },
        organizer:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
        }, 
        capacity:{
            type: Number, 
            default: 0, 
            validate: {
                validator: data=>{
                    return data<0?false:true
                }, 
                message: (n)=>{
                    console.log(n)

                    return `No se aceptan valores negativos. Usted ingreso ${n.value}`
                }
            }
        }
    },
    {
        timestamps: true, 
    }
)

export const eventModel=mongoose.model(
    "events", 
    EventsSchema
)